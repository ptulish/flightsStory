import { resolveCarrierCode } from './flightDisplay';

/**
 * Direct Gmail message link via stored Gmail message id.
 * Falls back to subject search when only the subject is available.
 */
export function gmailMessageLink({ messageId, subject, accountEmail } = {}) {
  const u = accountEmail ? gmailUserSegment(accountEmail) : 'u/0';
  if (messageId) return `https://mail.google.com/mail/${u}/#all/${encodeURIComponent(messageId)}`;
  if (subject) {
    return `https://mail.google.com/mail/${u}/#search/${encodeURIComponent(subject)}`;
  }
  return null;
}

/** Gmail uses /u/<index>/ for the active session. We don't know index; default to 0. */
function gmailUserSegment(_email) {
  return 'u/0';
}

/** Best-effort link to view the email in webmail (Gmail) or fall back to subject only. */
export function emailLinkForFlight(flight, accountEmail) {
  const source = flight?.source || flight?.raw_payload?.source;
  const messageId = flight?.raw_payload?.messageId || null;
  const subject = flight?.raw_subject || flight?.subject || null;
  if (source === 'gmail') {
    return gmailMessageLink({ messageId, subject, accountEmail });
  }
  return null;
}

export function emailLinkForUnresolved(item, accountEmail) {
  if (!item) return null;
  if (item.source === 'gmail') {
    return gmailMessageLink({
      messageId: item.message_id || item.raw_payload?.messageId,
      subject: item.subject,
      accountEmail,
    });
  }
  return null;
}

/**
 * A "review" suggestion: flights that need manual attention because parser
 * couldn't lock on the airline (XX/UN), produced an obviously-wrong code, or
 * looks like a duplicate of another flight in the same minute slot.
 */
export function reviewIssuesForFlight(flight, allFlights) {
  const issues = [];
  const code = resolveCarrierCode(flight);
  const rawAirline = String(flight?.airline || '').trim().toUpperCase();
  const isPlaceholder =
    !rawAirline || rawAirline === 'XX' || rawAirline === 'UN' || /^\d{2}$/.test(rawAirline);
  if (isPlaceholder || code === 'XX') {
    issues.push('unknown_airline');
  }
  const fn = String(flight?.flight_number || '').trim();
  if (!fn || /^[\s\d]+$/.test(fn)) {
    issues.push('weak_flight_number');
  }
  if (!flight?.from_iata || !flight?.to_iata) {
    issues.push('missing_route');
  }
  const dupes = (allFlights || []).filter(
    (other) =>
      other &&
      other.id !== flight.id &&
      other.from_iata === flight.from_iata &&
      other.to_iata === flight.to_iata &&
      sameMinute(other.departure_date, flight.departure_date),
  );
  if (dupes.length > 0) issues.push('possible_duplicate');
  return issues;
}

function sameMinute(a, b) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  if (Number.isNaN(da.getTime()) || Number.isNaN(db.getTime())) return false;
  return Math.abs(da.getTime() - db.getTime()) <= 60_000;
}

export function flightsNeedingReview(flights) {
  if (!Array.isArray(flights) || !flights.length) return [];
  const out = [];
  for (const f of flights) {
    const issues = reviewIssuesForFlight(f, flights);
    if (issues.length) out.push({ flight: f, issues });
  }
  return out;
}
