import { Plane, DollarSign, Calendar, MapPin } from 'lucide-react';
import { formatCurrency, formatDate, formatKm } from '../../utils/format';
import { getAirport } from '../../data/airports';

export default function MilestoneCards({ stats }) {
  const { longest, mostExpensive, firstFlight, lastFlight } = stats;

  const items = [
    longest && {
      key: 'longest',
      label: 'Longest hop',
      icon: Plane,
      title: `${formatKm(longest.distance_km)}`,
      subtitle: routeLine(longest),
      hint: formatDate(longest.departure_date),
      tint: 'text-accent-cyan',
    },
    mostExpensive && {
      key: 'mostExpensive',
      label: 'Priciest ticket',
      icon: DollarSign,
      title: formatCurrency(mostExpensive.price, mostExpensive.currency),
      subtitle: routeLine(mostExpensive),
      hint: formatDate(mostExpensive.departure_date),
      tint: 'text-accent-amber',
    },
    firstFlight && {
      key: 'first',
      label: 'It all started',
      icon: Calendar,
      title: formatDate(firstFlight.departure_date),
      subtitle: routeLine(firstFlight),
      hint: 'First flight on record',
      tint: 'text-accent-violet',
    },
    lastFlight && {
      key: 'last',
      label: 'Most recent',
      icon: MapPin,
      title: formatDate(lastFlight.departure_date),
      subtitle: routeLine(lastFlight),
      hint: 'Latest flight in your inbox',
      tint: 'text-accent-emerald',
    },
  ].filter(Boolean);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map(({ key, label, icon: Icon, title, subtitle, hint, tint }) => (
        <div key={key} className="card p-4">
          <div className="flex items-center justify-between">
            <p className="label">{label}</p>
            <Icon className={`h-4 w-4 ${tint}`} />
          </div>
          <p className="mt-3 font-display text-lg font-semibold">{title}</p>
          <p className="mt-1 truncate text-sm text-ink-muted">{subtitle}</p>
          <p className="mt-2 text-[10px] uppercase tracking-wider text-ink-dim">{hint}</p>
        </div>
      ))}
    </div>
  );
}

function routeLine(flight) {
  const from = flight.from || getAirport(flight.from_iata);
  const to = flight.to || getAirport(flight.to_iata);
  const fromCity = from?.city || flight.from_iata;
  const toCity = to?.city || flight.to_iata;
  return `${fromCity} → ${toCity}`;
}
