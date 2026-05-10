import { getAirline } from '../data/airlines';

const CARRIER_FN_RE = /\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s*0*(\d{1,4})\b/i;
const CARRIER_COMPACT_RE = /^([A-Z]{2}|[A-Z]\d|\d[A-Z])(\d{2,4})$/i;

function isValidIataCarrierCode(code) {
  if (!code || String(code).length !== 2) return false;
  const c = String(code).toUpperCase();
  if (c === 'XX') return false;
  if (/^\d{2}$/.test(c)) return false;
  return /^[A-Z0-9]{2}$/.test(c);
}

function carrierFromMessyString(s) {
  const v = String(s || '').trim().toUpperCase();
  if (!v) return null;
  let m = v.match(CARRIER_FN_RE);
  if (m && isValidIataCarrierCode(m[1])) return m[1].toUpperCase();
  m = v.match(CARRIER_COMPACT_RE);
  if (m && isValidIataCarrierCode(m[1])) return m[1].toUpperCase();
  m = v.match(/\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\b/);
  if (m && isValidIataCarrierCode(m[1])) return m[1].toUpperCase();
  return null;
}

/** Normalize carrier code from raw DB `airline` + `flight_number` (handles "BT282" in airline, etc.). */
export function resolveCarrierCode(flight) {
  const a = String(flight?.airline ?? '').trim().toUpperCase();
  if (isValidIataCarrierCode(a)) return a;
  const fromAirline = carrierFromMessyString(flight?.airline);
  if (fromAirline) return fromAirline;
  const fromFlight = carrierFromMessyString(flight?.flight_number);
  if (fromFlight) return fromFlight;
  return 'XX';
}

export function resolveFlightAirlineInfo(flight) {
  return getAirline(resolveCarrierCode(flight));
}

/** Flight number for UI: digits only when they pair with the resolved carrier (BT 282 → 282). */
export function displayFlightNumberDigits(flight) {
  const carrier = resolveCarrierCode(flight);
  const raw = String(flight?.flight_number ?? '').trim().toUpperCase();
  if (!raw) return '—';
  const re = /\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s*0*(\d{1,4})\b/gi;
  let m;
  while ((m = re.exec(raw)) !== null) {
    if (m[1].toUpperCase() === carrier) return stripFlightNumDigits(m[2]);
  }
  m = raw.match(CARRIER_COMPACT_RE);
  if (m && m[1].toUpperCase() === carrier) return stripFlightNumDigits(m[2]);
  m = raw.match(/\d{1,4}/);
  if (m) return stripFlightNumDigits(m[0]);
  return raw;
}

function stripFlightNumDigits(s) {
  const t = String(s).replace(/^0+(?=\d)/, '');
  return t || '0';
}

/**
 * Table / export: full designator when carrier is known; otherwise prefer "XX 123" from
 * `flight_number` over digits-only so mis-parsed rows stay readable.
 */
export function formatFlightNumberForTicket(flight) {
  const raw = String(flight?.flight_number ?? '').trim();
  if (!raw) return '—';
  const code = resolveCarrierCode(flight);
  const digits = displayFlightNumberDigits(flight);
  if (code && code !== 'XX') return `${code} ${digits}`;

  const compact = raw.replace(/\s+/g, ' ').toUpperCase();
  const sp = compact.match(/^([A-Z]{2}|[A-Z]\d|\d[A-Z])\s+(\d{1,4})$/);
  if (sp && isValidIataCarrierCode(sp[1])) return `${sp[1]} ${stripFlightNumDigits(sp[2])}`;
  const glued = compact.match(/^([A-Z]{2}|[A-Z]\d|\d[A-Z])(\d{2,4})$/);
  if (glued && isValidIataCarrierCode(glued[1])) return `${glued[1]} ${stripFlightNumDigits(glued[2])}`;

  if (!/^[\d\s]+$/.test(compact) && compact.length <= 16) return raw;
  return digits !== '—' ? digits : raw;
}
