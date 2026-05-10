import crypto from 'node:crypto';
import { AIRPORTS } from '../../src/data/airports.js';
import { env } from '../shared/env.js';
import { getJsonCache, setJsonCache } from '../cache.js';

const IATA_RE = /\b[A-Z]{3}\b/g;
const AIRLINE_RE = /\b([A-Z0-9]{2,3})\s?(\d{1,4})\b/;
const PRICE_RE = /\b(?:USD|EUR|GBP|RUB|\$|€|£)\s?(\d+(?:[.,]\d{1,2})?)\b/i;
const ISO_DATE_RE = /\b(20\d{2}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?\b/;

export async function parseFlightFromEmail(message) {
  const llmParsed = await parseViaGemini(message);
  const candidate = llmParsed || parseHeuristically(message);
  if (!candidate) return null;

  const from = await resolveAirport(candidate.from_iata);
  const to = await resolveAirport(candidate.to_iata);
  if (!from || !to) return null;

  const airline = normalizeAirline(candidate.airline);
  const flightNumber = normalizeFlightNumber(candidate.flight_number, airline);
  const departureDate = normalizeDepartureDate(candidate.departure_date);
  if (!airline || !flightNumber || !departureDate) return null;

  return {
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

function parseHeuristically({ subject, bodyText }) {
  const text = `${subject || ''}\n${bodyText || ''}`;
  const iatas = Array.from(new Set(text.match(IATA_RE) || [])).filter((code) => AIRPORTS[code]);
  if (iatas.length < 2) return null;

  const airlineMatch = text.match(AIRLINE_RE);
  const priceMatch = text.match(PRICE_RE);
  const dateMatch = text.match(ISO_DATE_RE);

  const airline = airlineMatch?.[1] || 'UN';
  const num = airlineMatch?.[2] || '0001';
  const date = dateMatch
    ? `${dateMatch[1]}T${dateMatch[2] || '09:00'}`
    : new Date().toISOString().slice(0, 16);

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
Return ONLY JSON object with keys:
airline, flight_number, from_iata, to_iata, departure_date, duration_min, price, currency, cabin.
If you cannot find flight, return {}.

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
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
  try {
    const parsed = JSON.parse(text);
    return parsed && Object.keys(parsed).length ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeAirline(value) {
  const v = String(value || '').trim().toUpperCase();
  if (!v) return null;
  return v.split(' ')[0].slice(0, 3);
}

function normalizeFlightNumber(value, airline) {
  const v = String(value || '').trim();
  if (!v) return `${airline} 0001`;
  if (/^[A-Z0-9]{2,3}\s+\d{1,4}$/i.test(v)) return v.toUpperCase();
  const digits = (v.match(/\d{1,4}/) || ['0001'])[0];
  return `${airline} ${digits}`;
}

function normalizeDepartureDate(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
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
