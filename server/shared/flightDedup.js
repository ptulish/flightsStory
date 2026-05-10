import crypto from 'node:crypto';

function trimFlightDigits(s) {
  const t = String(s).replace(/^0+(?=\d)/, '');
  return t || '0';
}

/** Numeric flight suffix for dedup (e.g. BT 282 → 282). */
export function flightNumberDigits(flightNumber, airlineCode) {
  const fn = String(flightNumber || '').trim().toUpperCase();
  const car = String(airlineCode || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (car.length >= 2) {
    const esc = car.slice(0, 2).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`^${esc}\\s*0*(\\d{1,4})\\b`);
    const m = fn.match(re);
    if (m) return trimFlightDigits(m[1]);
  }
  const m2 = fn.match(/\b[A-Z0-9]{2}\s*0*(\d{1,4})\b/);
  if (m2) return trimFlightDigits(m2[1]);
  const m3 = fn.match(/(\d{1,4})/);
  return m3 ? trimFlightDigits(m3[1]) : '0';
}

/**
 * Stable per-user key: same commercial segment → same hash even if different emails.
 * Uses UTC departure truncated to the hour so booking vs check-in emails still match
 * when the parsed clock differs by a few minutes.
 */
export function computeFlightDedupKey(userId, flight) {
  const airline = String(flight.airline || '').trim().toUpperCase();
  const digits = flightNumberDigits(flight.flight_number, airline);
  const from = String(flight.from_iata || '').trim().toUpperCase();
  const to = String(flight.to_iata || '').trim().toUpperCase();
  const d = new Date(flight.departure_date);
  const slot = Number.isNaN(d.getTime()) ? 'invalid-date' : d.toISOString().slice(0, 13);
  const raw = `${userId}|${digits}|${from}|${to}|${slot}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}
