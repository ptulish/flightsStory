import crypto from 'node:crypto';
import { AIRPORTS } from '../../src/data/airports.js';
import { AIRLINES } from '../../src/data/airlines.js';
import { env } from '../shared/env.js';
import { getJsonCache, setJsonCache } from '../cache.js';

const IATA_RE = /\b[A-Z]{3}\b/g;
/** IATA carrier + flight number only (no purely numeric "airline" like 202). */
const AIRLINE_RE = /\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s*0*(\d{1,4})\b/;
const PRICE_RE = /\b(?:USD|EUR|GBP|RUB|\$|€|£)\s?(\d+(?:[.,]\d{1,2})?)\b/i;

const MONTHS = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

/** First match wins. Never returns "now" — avoids fake identical timestamps. */
function extractDepartureDateString(text, receivedAt) {
  if (!text) return null;
  const lines = String(text).split(/\r?\n/);
  const focusedLines = lines.filter(
    (line) =>
      /\b(depart|departure|flight|itinerary|outbound|takeoff|boarding|arrival|route|segment)\b/i.test(line) ||
      /\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\s*\d{1,4}\b/.test(line),
  );

  const bestFocused = pickBestDateCandidate(focusedLines, receivedAt);
  if (bestFocused) return bestFocused;
  return pickBestDateCandidate(lines, receivedAt);
}

function pickBestDateCandidate(lines, receivedAt) {
  const candidates = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = String(lines[i] || '').trim();
    if (!line) continue;
    const iso = extractDepartureDateFromChunk(line);
    if (!iso) continue;
    const score = scoreDateLine(line);
    candidates.push({ iso, score, index: i, day: iso.slice(0, 10) });
  }
  if (!candidates.length) return null;
  candidates.sort((a, b) => b.score - a.score || a.index - b.index);
  let top = candidates[0];
  const receivedDay = normalizeDay(receivedAt);
  // Don't accidentally choose email sent/check-in notification date if alternatives exist.
  if (receivedDay && top.day === receivedDay && top.score < 4) {
    const alt = candidates.find((c) => c.day !== receivedDay && c.score >= top.score - 1);
    if (alt) top = alt;
  }
  return top.iso;
}

function scoreDateLine(line) {
  const l = String(line || '').toLowerCase();
  let s = 0;
  if (/\b(depart|departure|outbound|takeoff|itinerary|segment|flight)\b/.test(l)) s += 4;
  if (/\bfrom\b.+\bto\b|→/.test(l)) s += 2;
  if (/\b([a-z]{1}\d|\d[a-z]|[a-z]{2})\s*\d{1,4}\b/i.test(l)) s += 3;
  if (/\b(check-?in open|booking date|booked on|issued|purchase|invoice|receipt|payment)\b/.test(l)) s -= 4;
  if (/\b(sent|message-id|delivered)\b/.test(l)) s -= 3;
  return s;
}

function normalizeDay(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function extractDepartureDateFromChunk(text) {
  if (!text) return null;
  let m = text.match(/\b(20\d{2})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?\b/);
  if (m) {
    const t = m[4] && m[5] ? `${m[4]}:${m[5]}` : '12:00';
    return `${m[1]}-${m[2]}-${m[3]}T${t}`;
  }

  m = text.match(/\b(\d{1,2})[./-](\d{1,2})[./-](20\d{2})\D+(\d{1,2}):(\d{2})\b/);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mo = m[2].padStart(2, '0');
    const hh = m[4].padStart(2, '0');
    const mm = m[5].padStart(2, '0');
    return `${m[3]}-${mo}-${dd}T${hh}:${mm}`;
  }

  m = text.match(/\b(\d{1,2})\.(\d{1,2})\.(20\d{2})\b/);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mo = m[2].padStart(2, '0');
    return `${m[3]}-${mo}-${dd}T12:00`;
  }

  m = text.match(/\b(\d{1,2})[/\-](\d{1,2})[/\-](20\d{2})\b/);
  if (m) {
    const dd = m[1].padStart(2, '0');
    const mo = m[2].padStart(2, '0');
    return `${m[3]}-${mo}-${dd}T12:00`;
  }

  m = text.match(
    /\b(\d{1,2})\s+([A-Za-z]{3,9})\s+(20\d{2})\b|\b([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(20\d{2})\b/,
  );
  if (m) {
    let day;
    let monToken;
    let year;
    if (m[1]) {
      day = m[1].padStart(2, '0');
      monToken = m[2].toLowerCase();
      year = m[3];
    } else {
      monToken = m[4].toLowerCase();
      day = m[5].padStart(2, '0');
      year = m[6];
    }
    const mon = MONTHS[monToken] ?? MONTHS[monToken.slice(0, 3)];
    if (!mon) return null;
    const mo = String(mon).padStart(2, '0');
    return `${year}-${mo}-${day}T12:00`;
  }

  return null;
}

export async function parseFlightFromEmail(message) {
  const result = await parseFlightFromEmailDetailed(message);
  return result.flight;
}

export async function parseFlightFromEmailDetailed(message) {
  const llmParsed = await parseViaGemini(message);
  const candidate = llmParsed || parseHeuristically(message);
  if (!candidate) return { flight: null, unresolved: null, reason: 'no-flight-candidate' };

  const from = await resolveAirport(candidate.from_iata);
  const to = await resolveAirport(candidate.to_iata);

  let airline = normalizeAirline(candidate.airline);
  if (!isValidIataCarrierCode(airline)) {
    airline = carrierPrefixFromFlightNumber(candidate.flight_number);
  }
  if (!isValidIataCarrierCode(airline)) {
    airline = carrierPrefixFromFlightNumber(candidate.airline);
  }
  if (!isValidIataCarrierCode(airline)) {
    airline = inferAirlineFromText(message.subject, message.bodyText);
  }

  const text = `${message.subject || ''}\n${message.bodyText || ''}`;
  const extractedDate = extractDepartureDateString(text, message.receivedAt);
  const flightNumber =
    normalizeFlightNumber(candidate.flight_number, airline) ||
    normalizeFlightNumber(extractFlightNumberFromText(text, airline), airline);
  const departureDate = normalizeDepartureDate(
    pickPreferredDepartureDate(candidate.departure_date, extractedDate, message.receivedAt),
  );
  const issues = [];
  if (!from || !to) issues.push('missing_route');
  if (!isValidIataCarrierCode(airline)) issues.push('missing_airline');
  if (!flightNumber) issues.push('missing_flight_number');
  if (!departureDate) issues.push('missing_departure_date');

  if (issues.length > 0) {
    return {
      flight: null,
      unresolved: buildUnresolvedDraft({
        message,
        candidate,
        issues,
        from,
        to,
        airline,
        flightNumber,
        departureDate,
      }),
      reason: issues.join(','),
    };
  }

  return {
    flight: {
      id: crypto.randomUUID(),
      airline,
      flight_number: flightNumber,
      from_iata: from.iata,
      to_iata: to.iata,
      departure_date: departureDate,
      duration_min: asOptionalInt(candidate.duration_min),
      price: asOptionalNumber(candidate.price),
      currency: normalizeCurrency(candidate.currency),
      cabin: normalizeCabin(candidate.cabin),
      source: message.source,
      raw_subject: message.subject || 'Flight ticket',
    },
    unresolved: null,
    reason: null,
  };
}

async function resolveAirport(iataRaw) {
  const iata = String(iataRaw || '').trim().toUpperCase();
  if (!iata || iata.length !== 3) return null;

  const cacheKey = `airport:${iata}`;
  const cached = await getJsonCache(cacheKey);
  if (cached) return cached;

  const found = AIRPORTS[iata] || null;
  if (found) await setJsonCache(cacheKey, found);
  return found;
}

function parseHeuristically({ subject, bodyText, receivedAt }) {
  const text = `${subject || ''}\n${bodyText || ''}`;
  const iatas = Array.from(new Set(text.match(IATA_RE) || [])).filter((code) => AIRPORTS[code]);
  if (iatas.length < 2) return null;

  const airlineMatch = text.match(AIRLINE_RE);
  const priceMatch = text.match(PRICE_RE);
  const date = extractDepartureDateString(text, receivedAt);
  if (!date || !airlineMatch) return null;

  const airline = carrierPrefixFromFlightNumber(airlineMatch[0]);
  if (!isValidIataCarrierCode(airline)) return null;
  const num = airlineMatch[2];

  let currency = 'USD';
  if (priceMatch?.[0]?.includes('EUR') || priceMatch?.[0]?.includes('€')) currency = 'EUR';
  if (priceMatch?.[0]?.includes('GBP') || priceMatch?.[0]?.includes('£')) currency = 'GBP';
  if (priceMatch?.[0]?.includes('RUB')) currency = 'RUB';

  return {
    airline,
    flight_number: `${airline} ${num}`,
    from_iata: iatas[0],
    to_iata: iatas[1],
    departure_date: date,
    price: priceMatch ? Number(priceMatch[1].replace(',', '.')) : null,
    currency,
    cabin: 'economy',
    raw_subject: subject || 'Flight confirmation',
  };
}

async function parseViaGemini({ subject, bodyText }) {
  if (!env.GEMINI_API_KEY) return null;
  const prompt = `
Extract one primary flight from this email into strict JSON.
Return ONLY a JSON object with keys:
airline, flight_number, from_iata, to_iata, departure_date, duration_min, price, currency, cabin.

Rules:
- airline MUST be the 2-character IATA airline designator only (examples: LH, BT, FR, W6, TK, QR). Never a flight number, never three digits, never a long word.
- flight_number MUST look like "LH 410" or "BT 282" (carrier space digits).
- from_iata, to_iata: 3-letter IATA airport codes only.
- departure_date: scheduled takeoff datetime from itinerary/ticket in ISO 8601. Ignore email sent date, reminder date, check-in-open date, issue date. Do NOT use today's date. If unknown, return {}.
- If you cannot identify a real commercial flight in this email, return {}.

Subject: ${subject || ''}

Body:
${(bodyText || '').slice(0, 12000)}
  `.trim();

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      generationConfig: { temperature: 0.1, responseMimeType: 'application/json' },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }),
  });

  if (!res.ok) return null;
  const payload = await res.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const parsed = extractJsonObjectFromModelText(text);
  return parsed && Object.keys(parsed).length ? parsed : null;
}

/** Gemini sometimes wraps JSON in markdown despite responseMimeType. */
function extractJsonObjectFromModelText(raw) {
  if (!raw || typeof raw !== 'string') return null;
  let t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start >= 0 && end > start) t = t.slice(start, end + 1);
  try {
    return JSON.parse(t);
  } catch {
    return null;
  }
}

/** IATA airline designator: two chars; reject numeric-only (e.g. "37", "202"). */
function isValidIataCarrierCode(code) {
  if (!code || typeof code !== 'string') return false;
  const c = code.trim().toUpperCase();
  if (c.length !== 2) return false;
  if (/^\d{2}$/.test(c)) return false;
  return /^[A-Z0-9]{2}$/.test(c);
}

/** Pull "BT" from "BT 282", "LH410", "6E 123". */
function carrierPrefixFromFlightNumber(value) {
  const v = String(value || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ');
  const m = v.match(/^([A-Z]{2}|[A-Z]\d|\d[A-Z])\s*0*(\d{1,4})\b/);
  if (m && isValidIataCarrierCode(m[1])) return m[1];
  const m2 = v.match(/^([A-Z]{2}|[A-Z]\d|\d[A-Z])\d{2,4}\b/);
  if (m2 && isValidIataCarrierCode(m2[1])) return m2[1];
  return null;
}

function normalizeAirline(value) {
  const v = String(value || '').trim().toUpperCase();
  if (!v) return null;
  const fromWord = v.match(/\b([A-Z]{2}|[A-Z]\d|\d[A-Z])\b/);
  if (fromWord && isValidIataCarrierCode(fromWord[1])) return fromWord[1];
  if (v.length >= 2 && /^[A-Z]{2}/.test(v) && isValidIataCarrierCode(v.slice(0, 2))) return v.slice(0, 2);
  const fromFn = carrierPrefixFromFlightNumber(v);
  return fromFn;
}

function normalizeFlightNumber(value, airline) {
  const v = String(value || '').trim();
  if (!v) return null;
  if (/^[A-Z0-9]{2,3}\s+\d{1,4}$/i.test(v)) return v.toUpperCase();
  const designator = extractFlightNumberFromText(v, airline);
  if (designator) return designator;
  const digits = (v.match(/\d{1,4}/) || [null])[0];
  if (!digits) return null;
  return `${airline} ${digits}`;
}

function normalizeDepartureDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  const y = parsed.getUTCFullYear();
  if (y < 2000 || y > 2100) return null;
  return parsed.toISOString();
}

function normalizeCurrency(value) {
  if (!value) return 'USD';
  const v = String(value).toUpperCase();
  if (['USD', 'EUR', 'GBP', 'RUB'].includes(v)) return v;
  return 'USD';
}

function normalizeCabin(value) {
  const v = String(value || 'economy').toLowerCase();
  if (['economy', 'business', 'premium', 'first'].includes(v)) return v;
  return 'economy';
}

function asOptionalInt(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

function asOptionalNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pickPreferredDepartureDate(modelDate, extractedDate, receivedAt) {
  const m = normalizeDepartureDate(modelDate);
  const e = normalizeDepartureDate(extractedDate);
  if (!m) return e;
  if (!e) return m;
  const receivedDay = normalizeDay(receivedAt);
  const mDay = m.slice(0, 10);
  const eDay = e.slice(0, 10);
  if (receivedDay && mDay === receivedDay && eDay !== receivedDay) return e;
  return m;
}

function buildUnresolvedDraft({
  message,
  candidate,
  issues,
  from,
  to,
  airline,
  flightNumber,
  departureDate,
}) {
  const critical =
    issues.includes('missing_airline') || issues.includes('missing_departure_date');
  if (!critical) return null;

  const fromIata = from?.iata || normalizeIata(candidate?.from_iata);
  const toIata = to?.iata || normalizeIata(candidate?.to_iata);
  if (!fromIata || !toIata) return null;

  const text = `${message?.subject || ''}\n${message?.bodyText || ''}`;
  const derivedAirline = isValidIataCarrierCode(airline) ? airline : normalizeAirline(candidate?.airline);
  const derivedFlight =
    flightNumber ||
    extractFlightNumberFromText(String(candidate?.flight_number || ''), derivedAirline) ||
    extractFlightNumberFromText(text, derivedAirline) ||
    null;
  const derivedDate =
    departureDate ||
    normalizeDepartureDate(candidate?.departure_date) ||
    normalizeDepartureDate(extractDepartureDateString(text, message?.receivedAt));

  return {
    reason_codes: issues,
    source: message?.source || 'gmail',
    subject: message?.subject || '',
    body_snippet: makeBodySnippet(message?.bodyText),
    message_id: message?.messageId || null,
    received_at: normalizeAnyDate(message?.receivedAt),
    from_iata: fromIata,
    to_iata: toIata,
    airline: derivedAirline || null,
    flight_number: derivedFlight || null,
    departure_date: derivedDate || null,
  };
}

function normalizeIata(value) {
  const v = String(value || '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(v) ? v : null;
}

function makeBodySnippet(value) {
  const clean = String(value || '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.slice(0, 1200);
}

function normalizeAnyDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function inferAirlineFromText(subject, bodyText) {
  const text = `${subject || ''}\n${bodyText || ''}`.toLowerCase();
  if (!text.trim()) return null;

  const aliases = [
    ['LH', ['lufthansa']],
    ['BT', ['airbaltic', 'air baltic']],
    ['FR', ['ryanair']],
    ['W6', ['wizz', 'wizzair', 'wizz air']],
    ['U2', ['easyjet', 'easy jet']],
    ['SU', ['aeroflot']],
    ['TK', ['turkish airlines', 'turkish']],
    ['PC', ['pegasus']],
    ['KL', ['klm']],
    ['AF', ['air france']],
    ['BA', ['british airways']],
    ['EK', ['emirates']],
    ['QR', ['qatar airways', 'qatar']],
  ];

  for (const [code, words] of aliases) {
    if (!AIRLINES[code]) continue;
    if (words.some((w) => text.includes(w))) return code;
  }
  return null;
}

function extractFlightNumberFromText(text, airline) {
  const t = String(text || '').toUpperCase();
  const a = String(airline || '').toUpperCase();
  if (!a) return null;
  const esc = a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  let m = t.match(new RegExp(`\\b${esc}\\s*0*(\\d{1,4})\\b`));
  if (m) return `${a} ${m[1]}`;
  m = t.match(new RegExp(`\\b${esc}(\\d{1,4})\\b`));
  if (m) return `${a} ${m[1]}`;
  return null;
}
