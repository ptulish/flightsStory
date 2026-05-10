import { getAirport } from '../data/airports';
import { haversineKm } from './geo';
import { toUSD } from './format';
import { resolveFlightAirlineInfo, resolveCarrierCode } from './flightDisplay';

// Decorate a raw flight with derived geometry/distance/airline data so all
// downstream components consume the same shape.
export function enrichFlight(flight) {
  const from = getAirport(flight.from_iata);
  const to = getAirport(flight.to_iata);
  const distance_km = from && to ? haversineKm(from, to) : 0;
  const airline = resolveFlightAirlineInfo(flight);
  return {
    ...flight,
    from,
    to,
    airline_info: airline,
    distance_km,
    price_usd: toUSD(flight.price ?? 0, flight.currency || 'USD'),
    year: new Date(flight.departure_date).getFullYear(),
    month: new Date(flight.departure_date).getMonth(),
  };
}

export function enrichAll(flights) {
  return flights
    .map(enrichFlight)
    .sort((a, b) => new Date(a.departure_date) - new Date(b.departure_date));
}

export function computeStats(flights) {
  const enriched = enrichAll(flights);

  const totalFlights = enriched.length;
  const totalKm = enriched.reduce((s, f) => s + f.distance_km, 0);
  const totalSpendUSD = enriched.reduce((s, f) => s + f.price_usd, 0);
  const totalMinutes = enriched.reduce((s, f) => s + (f.duration_min || 0), 0);

  // Cities & countries
  const cities = new Set();
  const countries = new Set();
  enriched.forEach((f) => {
    if (f.from) {
      cities.add(`${f.from.city}|${f.from.country}`);
      countries.add(f.from.country);
    }
    if (f.to) {
      cities.add(`${f.to.city}|${f.to.country}`);
      countries.add(f.to.country);
    }
  });

  // Airlines
  const airlineMap = new Map();
  enriched.forEach((f) => {
    const k = resolveCarrierCode(f);
    const cur = airlineMap.get(k) || { ...f.airline_info, count: 0, distance_km: 0 };
    cur.count += 1;
    cur.distance_km += f.distance_km;
    airlineMap.set(k, cur);
  });
  const airlines = [...airlineMap.values()].sort((a, b) => b.count - a.count);

  // Routes (treat A↔B as a single route)
  const routeMap = new Map();
  enriched.forEach((f) => {
    if (!f.from || !f.to) return;
    const key = [f.from_iata, f.to_iata].sort().join('-');
    const cur = routeMap.get(key) || {
      key,
      a: f.from,
      b: f.to,
      count: 0,
      distance_km: f.distance_km,
    };
    cur.count += 1;
    routeMap.set(key, cur);
  });
  const routes = [...routeMap.values()].sort((a, b) => b.count - a.count);

  // Per-year breakdown
  const yearMap = new Map();
  enriched.forEach((f) => {
    const cur = yearMap.get(f.year) || { year: f.year, flights: 0, distance_km: 0, spend_usd: 0 };
    cur.flights += 1;
    cur.distance_km += f.distance_km;
    cur.spend_usd += f.price_usd;
    yearMap.set(f.year, cur);
  });
  const byYear = [...yearMap.values()].sort((a, b) => a.year - b.year);

  // Per-month (combined across years) — used for "favorite travel month".
  const monthMap = new Map();
  for (let m = 0; m < 12; m++) monthMap.set(m, { month: m, flights: 0 });
  enriched.forEach((f) => {
    monthMap.get(f.month).flights += 1;
  });
  const byMonth = [...monthMap.values()];

  // Cabin breakdown
  const cabinMap = new Map();
  enriched.forEach((f) => {
    const k = f.cabin || 'economy';
    cabinMap.set(k, (cabinMap.get(k) || 0) + 1);
  });
  const byCabin = [...cabinMap.entries()].map(([cabin, count]) => ({ cabin, count }));

  const longest = enriched.reduce(
    (best, f) => (f.distance_km > (best?.distance_km ?? -1) ? f : best),
    null,
  );
  const mostExpensive = enriched.reduce(
    (best, f) => (f.price_usd > (best?.price_usd ?? -1) ? f : best),
    null,
  );

  const firstFlight = enriched[0] || null;
  const lastFlight = enriched[enriched.length - 1] || null;

  return {
    flights: enriched,
    totals: {
      flights: totalFlights,
      distance_km: totalKm,
      spend_usd: totalSpendUSD,
      airtime_min: totalMinutes,
      cities: cities.size,
      countries: countries.size,
      airlines: airlines.length,
    },
    airlines,
    routes,
    byYear,
    byMonth,
    byCabin,
    longest,
    mostExpensive,
    firstFlight,
    lastFlight,
  };
}

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
