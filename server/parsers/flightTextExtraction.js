/**
 * Extract the most likely IATA flight designator (e.g. OS 282, BT282) from raw email text.
 * Scores matches near flight-related keywords higher than random codes elsewhere.
 */

const FLIGHT_CONTEXT =
  /(flight|flug|рейс|рейса|carrier|operating|operated|авиакомпани|airline|boarding|itinerary|segment|pnr|confirmation|ticket)/i;

const NOISE_LINE = /\b(seat|row|gate|terminal|baggage|queue|group|zone)\b/i;

const CARRIER_CODE =
  /\b([A-Z]{2}|[A-Z]\d|\d[A-Z])[ \t\u00a0]*0*([0-9]{1,4})\b/g;

function trimDigits(s) {
  const t = String(s).replace(/^0+(?=\d)/, '');
  return t || '0';
}

function isValidCarrier(carrier) {
  if (!carrier || carrier.length !== 2) return false;
  if (carrier === 'XX') return false;
  if (/^\d{2}$/.test(carrier)) return false;
  return /^[A-Z0-9]{2}$/.test(carrier);
}

function lineAtIndex(text, idx) {
  const lineStart = text.lastIndexOf('\n', idx) + 1;
  const lineEnd = text.indexOf('\n', idx);
  return text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
}

function scoreLineForFlight(line, carrier, digits) {
  const l = String(line || '');
  let score = 0;
  if (NOISE_LINE.test(l) && !FLIGHT_CONTEXT.test(l)) score -= 6;
  if (FLIGHT_CONTEXT.test(l)) score += 8;
  if (/\bflt\b|\bo\/a\b/i.test(l)) score += 5;
  if (/\b(VIE|RIX|FRA|MUC|AMS|CDG|LHR|BCN|MAD|IST|DXB|SVO|DME|LED|RIX|TLL|ARN|CPH|OSL)\b/.test(l)) score += 3;
  if (/\b(confirmation|booking|reference|record)\b/i.test(l)) score += 2;
  if (digits.length >= 3) score += 1;
  if (/\bAUSTRIAN\b|\bAIR\s*BALTIC\b|\bLUFTHANSA\b|\bRYANAIR\b/i.test(l)) score += 6;
  return score;
}

/**
 * @returns {{ carrier: string, digits: string, formatted: string } | null}
 */
export function extractBestFlightDesignatorFromText(subject, bodyText) {
  const text = `${subject || ''}\n${bodyText || ''}`;
  if (!text.trim()) return null;
  const upper = text.toUpperCase();
  let best = null;

  CARRIER_CODE.lastIndex = 0;
  let m;
  while ((m = CARRIER_CODE.exec(upper)) !== null) {
    const carrier = m[1];
    if (!isValidCarrier(carrier)) continue;
    const digits = trimDigits(m[2]);
    if (digits === '0') continue;
    const lineForScore = lineAtIndex(upper, m.index);
    const score = scoreLineForFlight(lineForScore, carrier, digits);
    if (!best || score > best.score || (score === best.score && m.index < best.index)) {
      best = {
        carrier,
        digits,
        formatted: `${carrier} ${digits}`,
        score,
        index: m.index,
      };
    }
  }

  if (!best) return null;
  if (best.score < 0) return null;
  return { carrier: best.carrier, digits: best.digits, formatted: best.formatted };
}

/**
 * Try "FROM VIE ... TO RIX" style ordering (better than first-two IATAs in document order).
 * @returns {{ from: string, to: string } | null}
 */
export function extractRouteIatasFromText(text) {
  const t = String(text || '').toUpperCase();
  const m = t.match(
    /\b(FROM|DEPART(?:URE)?|ORIGIN|OUTBOUND)\b[^A-Z0-9]{0,12}([A-Z]{3})\b[\s\S]{0,220}?\b(TO|ARRIV(?:AL|E)|DESTINATION|INBOUND)\b[^A-Z0-9]{0,12}([A-Z]{3})\b/,
  );
  if (m && m[2] && m[4]) return { from: m[2], to: m[4] };
  const m2 = t.match(/\b([A-Z]{3})\s*(?:→|->|—|-)\s*([A-Z]{3})\b/);
  if (m2) return { from: m2[1], to: m2[2] };
  return null;
}
