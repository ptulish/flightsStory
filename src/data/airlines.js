// Airline reference. Subset used by demo data + display.
// Each airline has a brand color used for arc rendering and chips.

export const AIRLINES = {
  S7: { code: 'S7', name: 'S7 Airlines', color: '#22c55e' },
  SU: { code: 'SU', name: 'Aeroflot', color: '#3b82f6' },
  U6: { code: 'U6', name: 'Ural Airlines', color: '#ef4444' },
  TK: { code: 'TK', name: 'Turkish Airlines', color: '#dc2626' },
  PC: { code: 'PC', name: 'Pegasus', color: '#f59e0b' },
  LH: { code: 'LH', name: 'Lufthansa', color: '#fbbf24' },
  BT: { code: 'BT', name: 'airBaltic', color: '#9d2235' },
  FR: { code: 'FR', name: 'Ryanair', color: '#073590' },
  W6: { code: 'W6', name: 'Wizz Air', color: '#c6007e' },
  U2: { code: 'U2', name: 'easyJet', color: '#ff6600' },
  KL: { code: 'KL', name: 'KLM', color: '#06b6d4' },
  AF: { code: 'AF', name: 'Air France', color: '#0ea5e9' },
  BA: { code: 'BA', name: 'British Airways', color: '#1d4ed8' },
  IB: { code: 'IB', name: 'Iberia', color: '#f43f5e' },
  AY: { code: 'AY', name: 'Finnair', color: '#0284c7' },
  EK: { code: 'EK', name: 'Emirates', color: '#dc2626' },
  QR: { code: 'QR', name: 'Qatar Airways', color: '#7c3aed' },
  EY: { code: 'EY', name: 'Etihad', color: '#a78bfa' },
  SQ: { code: 'SQ', name: 'Singapore Airlines', color: '#facc15' },
  CX: { code: 'CX', name: 'Cathay Pacific', color: '#10b981' },
  JL: { code: 'JL', name: 'Japan Airlines', color: '#dc2626' },
  KE: { code: 'KE', name: 'Korean Air', color: '#0ea5e9' },
  TG: { code: 'TG', name: 'Thai Airways', color: '#a855f7' },
  AA: { code: 'AA', name: 'American Airlines', color: '#1e40af' },
  DL: { code: 'DL', name: 'Delta', color: '#dc2626' },
  UA: { code: 'UA', name: 'United', color: '#1e3a8a' },
  AC: { code: 'AC', name: 'Air Canada', color: '#dc2626' },
  WZ: { code: 'WZ', name: 'Red Wings', color: '#b91c1c' },
  N4: { code: 'N4', name: 'Nordwind', color: '#1d4ed8' },
};

export function getAirline(code) {
  return AIRLINES[code] || { code: code || 'XX', name: 'Unknown airline', color: '#5e85ff' };
}
