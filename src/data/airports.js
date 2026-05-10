// IATA airport reference. Subset of the busiest airports relevant to demo data.
// In production this becomes the `Airports` table seeded from OurAirports / OpenFlights.

export const AIRPORTS = {
  // Russia / CIS
  SVO: { iata: 'SVO', name: 'Sheremetyevo', city: 'Moscow', country: 'Russia', lat: 55.9726, lng: 37.4146 },
  DME: { iata: 'DME', name: 'Domodedovo', city: 'Moscow', country: 'Russia', lat: 55.4088, lng: 37.9063 },
  VKO: { iata: 'VKO', name: 'Vnukovo', city: 'Moscow', country: 'Russia', lat: 55.5915, lng: 37.2615 },
  LED: { iata: 'LED', name: 'Pulkovo', city: 'Saint Petersburg', country: 'Russia', lat: 59.8003, lng: 30.2625 },
  KZN: { iata: 'KZN', name: 'Kazan Intl', city: 'Kazan', country: 'Russia', lat: 55.6062, lng: 49.2787 },
  AER: { iata: 'AER', name: 'Sochi Intl', city: 'Sochi', country: 'Russia', lat: 43.4499, lng: 39.9566 },
  KGD: { iata: 'KGD', name: 'Khrabrovo', city: 'Kaliningrad', country: 'Russia', lat: 54.8896, lng: 20.5926 },
  OVB: { iata: 'OVB', name: 'Tolmachevo', city: 'Novosibirsk', country: 'Russia', lat: 55.0126, lng: 82.6507 },
  TBS: { iata: 'TBS', name: 'Tbilisi Intl', city: 'Tbilisi', country: 'Georgia', lat: 41.6692, lng: 44.9547 },
  EVN: { iata: 'EVN', name: 'Zvartnots', city: 'Yerevan', country: 'Armenia', lat: 40.1473, lng: 44.3959 },
  GYD: { iata: 'GYD', name: 'Heydar Aliyev', city: 'Baku', country: 'Azerbaijan', lat: 40.4675, lng: 50.0467 },
  TAS: { iata: 'TAS', name: 'Tashkent Intl', city: 'Tashkent', country: 'Uzbekistan', lat: 41.2579, lng: 69.2812 },
  ALA: { iata: 'ALA', name: 'Almaty Intl', city: 'Almaty', country: 'Kazakhstan', lat: 43.3521, lng: 77.0405 },
  IKT: { iata: 'IKT', name: 'Irkutsk Intl', city: 'Irkutsk', country: 'Russia', lat: 52.268, lng: 104.39 },

  // Europe
  IST: { iata: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Türkiye', lat: 41.2753, lng: 28.7519 },
  SAW: { iata: 'SAW', name: 'Sabiha Gökçen', city: 'Istanbul', country: 'Türkiye', lat: 40.8987, lng: 29.3092 },
  AYT: { iata: 'AYT', name: 'Antalya', city: 'Antalya', country: 'Türkiye', lat: 36.8987, lng: 30.8005 },
  LHR: { iata: 'LHR', name: 'Heathrow', city: 'London', country: 'United Kingdom', lat: 51.47, lng: -0.4543 },
  LGW: { iata: 'LGW', name: 'Gatwick', city: 'London', country: 'United Kingdom', lat: 51.1537, lng: -0.1821 },
  CDG: { iata: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France', lat: 49.0097, lng: 2.5479 },
  ORY: { iata: 'ORY', name: 'Orly', city: 'Paris', country: 'France', lat: 48.7233, lng: 2.3794 },
  FRA: { iata: 'FRA', name: 'Frankfurt am Main', city: 'Frankfurt', country: 'Germany', lat: 50.0379, lng: 8.5622 },
  MUC: { iata: 'MUC', name: 'Munich', city: 'Munich', country: 'Germany', lat: 48.3538, lng: 11.7861 },
  BER: { iata: 'BER', name: 'Berlin Brandenburg', city: 'Berlin', country: 'Germany', lat: 52.3667, lng: 13.5033 },
  AMS: { iata: 'AMS', name: 'Schiphol', city: 'Amsterdam', country: 'Netherlands', lat: 52.3105, lng: 4.7683 },
  BRU: { iata: 'BRU', name: 'Brussels', city: 'Brussels', country: 'Belgium', lat: 50.9014, lng: 4.4844 },
  MAD: { iata: 'MAD', name: 'Barajas', city: 'Madrid', country: 'Spain', lat: 40.4983, lng: -3.5676 },
  BCN: { iata: 'BCN', name: 'El Prat', city: 'Barcelona', country: 'Spain', lat: 41.2974, lng: 2.0833 },
  LIS: { iata: 'LIS', name: 'Humberto Delgado', city: 'Lisbon', country: 'Portugal', lat: 38.7813, lng: -9.1359 },
  FCO: { iata: 'FCO', name: 'Fiumicino', city: 'Rome', country: 'Italy', lat: 41.8003, lng: 12.2389 },
  MXP: { iata: 'MXP', name: 'Malpensa', city: 'Milan', country: 'Italy', lat: 45.6306, lng: 8.7281 },
  VIE: { iata: 'VIE', name: 'Vienna Intl', city: 'Vienna', country: 'Austria', lat: 48.1103, lng: 16.5697 },
  ZRH: { iata: 'ZRH', name: 'Zürich', city: 'Zürich', country: 'Switzerland', lat: 47.4647, lng: 8.5492 },
  CPH: { iata: 'CPH', name: 'Copenhagen', city: 'Copenhagen', country: 'Denmark', lat: 55.6181, lng: 12.6561 },
  ARN: { iata: 'ARN', name: 'Stockholm Arlanda', city: 'Stockholm', country: 'Sweden', lat: 59.6519, lng: 17.9186 },
  HEL: { iata: 'HEL', name: 'Helsinki-Vantaa', city: 'Helsinki', country: 'Finland', lat: 60.3172, lng: 24.9633 },
  OSL: { iata: 'OSL', name: 'Oslo Gardermoen', city: 'Oslo', country: 'Norway', lat: 60.1939, lng: 11.1004 },
  PRG: { iata: 'PRG', name: 'Václav Havel', city: 'Prague', country: 'Czech Republic', lat: 50.1008, lng: 14.26 },
  WAW: { iata: 'WAW', name: 'Chopin', city: 'Warsaw', country: 'Poland', lat: 52.1657, lng: 20.9671 },
  BUD: { iata: 'BUD', name: 'Ferenc Liszt', city: 'Budapest', country: 'Hungary', lat: 47.4399, lng: 19.2616 },
  ATH: { iata: 'ATH', name: 'Eleftherios Venizelos', city: 'Athens', country: 'Greece', lat: 37.9364, lng: 23.9445 },
  RHO: { iata: 'RHO', name: 'Rhodes Diagoras', city: 'Rhodes', country: 'Greece', lat: 36.4054, lng: 28.0862 },
  SPU: { iata: 'SPU', name: 'Split', city: 'Split', country: 'Croatia', lat: 43.5389, lng: 16.298 },
  TIV: { iata: 'TIV', name: 'Tivat', city: 'Tivat', country: 'Montenegro', lat: 42.4047, lng: 18.7233 },
  TLV: { iata: 'TLV', name: 'Ben Gurion', city: 'Tel Aviv', country: 'Israel', lat: 32.0114, lng: 34.8867 },
  RIX: { iata: 'RIX', name: 'Riga Intl', city: 'Riga', country: 'Latvia', lat: 56.9236, lng: 23.9711 },
  TLL: { iata: 'TLL', name: 'Tallinn Lennart Meri', city: 'Tallinn', country: 'Estonia', lat: 59.4133, lng: 24.8328 },
  KEF: { iata: 'KEF', name: 'Keflavík', city: 'Reykjavík', country: 'Iceland', lat: 63.985, lng: -22.6056 },

  // Middle East
  DXB: { iata: 'DXB', name: 'Dubai Intl', city: 'Dubai', country: 'UAE', lat: 25.2532, lng: 55.3657 },
  AUH: { iata: 'AUH', name: 'Abu Dhabi Intl', city: 'Abu Dhabi', country: 'UAE', lat: 24.433, lng: 54.6511 },
  DOH: { iata: 'DOH', name: 'Hamad Intl', city: 'Doha', country: 'Qatar', lat: 25.2731, lng: 51.6081 },

  // Asia
  HKG: { iata: 'HKG', name: 'Hong Kong Intl', city: 'Hong Kong', country: 'Hong Kong', lat: 22.308, lng: 113.9185 },
  PEK: { iata: 'PEK', name: 'Beijing Capital', city: 'Beijing', country: 'China', lat: 40.0801, lng: 116.5846 },
  PVG: { iata: 'PVG', name: 'Pudong', city: 'Shanghai', country: 'China', lat: 31.1443, lng: 121.8083 },
  HND: { iata: 'HND', name: 'Haneda', city: 'Tokyo', country: 'Japan', lat: 35.5494, lng: 139.7798 },
  NRT: { iata: 'NRT', name: 'Narita', city: 'Tokyo', country: 'Japan', lat: 35.7647, lng: 140.3863 },
  ICN: { iata: 'ICN', name: 'Incheon', city: 'Seoul', country: 'South Korea', lat: 37.4691, lng: 126.4505 },
  SIN: { iata: 'SIN', name: 'Changi', city: 'Singapore', country: 'Singapore', lat: 1.3644, lng: 103.9915 },
  BKK: { iata: 'BKK', name: 'Suvarnabhumi', city: 'Bangkok', country: 'Thailand', lat: 13.69, lng: 100.7501 },
  HKT: { iata: 'HKT', name: 'Phuket Intl', city: 'Phuket', country: 'Thailand', lat: 8.1132, lng: 98.3169 },
  DPS: { iata: 'DPS', name: 'Ngurah Rai', city: 'Denpasar', country: 'Indonesia', lat: -8.7482, lng: 115.1672 },
  KUL: { iata: 'KUL', name: 'Kuala Lumpur Intl', city: 'Kuala Lumpur', country: 'Malaysia', lat: 2.7456, lng: 101.7099 },
  DEL: { iata: 'DEL', name: 'Indira Gandhi', city: 'Delhi', country: 'India', lat: 28.5562, lng: 77.1 },
  BOM: { iata: 'BOM', name: 'Chhatrapati Shivaji', city: 'Mumbai', country: 'India', lat: 19.0896, lng: 72.8656 },
  MLE: { iata: 'MLE', name: 'Velana Intl', city: 'Malé', country: 'Maldives', lat: 4.1918, lng: 73.5291 },
  CMB: { iata: 'CMB', name: 'Bandaranaike Intl', city: 'Colombo', country: 'Sri Lanka', lat: 7.1808, lng: 79.8842 },

  // Americas
  JFK: { iata: 'JFK', name: 'John F. Kennedy', city: 'New York', country: 'United States', lat: 40.6413, lng: -73.7781 },
  EWR: { iata: 'EWR', name: 'Newark Liberty', city: 'New York', country: 'United States', lat: 40.6925, lng: -74.1687 },
  LAX: { iata: 'LAX', name: 'Los Angeles Intl', city: 'Los Angeles', country: 'United States', lat: 33.9416, lng: -118.4085 },
  SFO: { iata: 'SFO', name: 'San Francisco Intl', city: 'San Francisco', country: 'United States', lat: 37.6213, lng: -122.379 },
  MIA: { iata: 'MIA', name: 'Miami Intl', city: 'Miami', country: 'United States', lat: 25.7959, lng: -80.287 },
  SEA: { iata: 'SEA', name: 'Seattle-Tacoma', city: 'Seattle', country: 'United States', lat: 47.4502, lng: -122.3088 },
  ORD: { iata: 'ORD', name: "O'Hare", city: 'Chicago', country: 'United States', lat: 41.9742, lng: -87.9073 },
  YYZ: { iata: 'YYZ', name: 'Toronto Pearson', city: 'Toronto', country: 'Canada', lat: 43.6777, lng: -79.6248 },
  MEX: { iata: 'MEX', name: 'Benito Juárez', city: 'Mexico City', country: 'Mexico', lat: 19.4361, lng: -99.0719 },
  CUN: { iata: 'CUN', name: 'Cancún Intl', city: 'Cancún', country: 'Mexico', lat: 21.0365, lng: -86.877 },
  GRU: { iata: 'GRU', name: 'Guarulhos', city: 'São Paulo', country: 'Brazil', lat: -23.4356, lng: -46.4731 },
  EZE: { iata: 'EZE', name: 'Ministro Pistarini', city: 'Buenos Aires', country: 'Argentina', lat: -34.8222, lng: -58.5358 },
  HAV: { iata: 'HAV', name: 'José Martí', city: 'Havana', country: 'Cuba', lat: 22.9892, lng: -82.4091 },

  // Africa
  CAI: { iata: 'CAI', name: 'Cairo Intl', city: 'Cairo', country: 'Egypt', lat: 30.1219, lng: 31.4056 },
  HRG: { iata: 'HRG', name: 'Hurghada Intl', city: 'Hurghada', country: 'Egypt', lat: 27.1783, lng: 33.7994 },
  SSH: { iata: 'SSH', name: 'Sharm El Sheikh', city: 'Sharm El Sheikh', country: 'Egypt', lat: 27.9773, lng: 34.3954 },
  CPT: { iata: 'CPT', name: 'Cape Town Intl', city: 'Cape Town', country: 'South Africa', lat: -33.9648, lng: 18.6017 },

  // Oceania
  SYD: { iata: 'SYD', name: 'Kingsford Smith', city: 'Sydney', country: 'Australia', lat: -33.9399, lng: 151.1753 },
};

export function getAirport(iata) {
  return AIRPORTS[iata] || null;
}

export function airportSearch(q) {
  const needle = (q || '').trim().toLowerCase();
  if (!needle) return [];
  return Object.values(AIRPORTS)
    .filter(
      (a) =>
        a.iata.toLowerCase().includes(needle) ||
        a.city.toLowerCase().includes(needle) ||
        a.country.toLowerCase().includes(needle) ||
        a.name.toLowerCase().includes(needle),
    )
    .slice(0, 8);
}
