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

export function carrierFromFlightNumber(flightNumber, airlineCode) {
  const fn = String(flightNumber || '').trim().toUpperCase();
  const m = fn.match(/\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s*0*\d{1,4}\b/);
  if (m) return m[1].toUpperCase();
  const fallback = String(airlineCode || '').trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(fallback) || /^[A-Z]\d$/.test(fallback) || /^\d[A-Z]$/.test(fallback)) return fallback;
  return 'XX';
}

/** Canonical designator like BT282, W61234. */
export function flightDesignator(flightNumber, airlineCode) {
  const carrier = carrierFromFlightNumber(flightNumber, airlineCode);
  const digits = flightNumberDigits(flightNumber, airlineCode);
  return `${carrier}${digits}`;
}

/**
 * Stable per-user key: same commercial segment → same hash even if different emails.
 * Uses UTC departure date (day granularity), so booking/check-in/reminder variants
 * still match when one email has full time and another has only date.
 */
export function computeFlightDedupKey(userId, flight) {
  const airline = String(flight.airline || '').trim().toUpperCase();
  const designator = flightDesignator(flight.flight_number, airline);
  const from = String(flight.from_iata || '').trim().toUpperCase();
  const to = String(flight.to_iata || '').trim().toUpperCase();
  const d = new Date(flight.departure_date);
  const slot = Number.isNaN(d.getTime()) ? 'invalid-date' : d.toISOString().slice(0, 10);
  const raw = `${userId}|${designator}|${from}|${to}|${slot}`;
  return crypto.createHash('sha256').update(raw).digest('hex');
}
