import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Ticket as TicketIcon, Download, AlertTriangle, ExternalLink } from 'lucide-react';
import { useSession } from '../state/session.jsx';
import { computeStats } from '../utils/stats';
import TicketList from '../components/TicketList.jsx';
import { formatNumber, formatKm, formatCurrency, formatDate } from '../utils/format';
import { formatFlightNumberForTicket } from '../utils/flightDisplay';
import {
  deleteFlight,
  fetchUnresolvedFlights,
  ignoreUnresolvedFlight,
  resolveUnresolvedFlight,
  updateFlight,
} from '../api/flights';
import {
  emailLinkForFlight,
  emailLinkForUnresolved,
  flightsNeedingReview,
} from '../utils/emailLinks';

export default function Tickets() {
  const { flights, account, setFlights } = useSession();
  const stats = useMemo(() => computeStats(flights), [flights]);
  const [unresolved, setUnresolved] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const suspectFlights = useMemo(() => flightsNeedingReview(flights || []), [flights]);

  const exportCsv = () => {
    const rows = [
      ['date', 'airline', 'flight_no', 'from', 'to', 'distance_km', 'duration_min', 'price', 'currency', 'cabin'],
      ...stats.flights.map((f) => [
        f.departure_date,
        f.airline_info.name,
        formatFlightNumberForTicket(f),
        `${f.from?.city || f.from_iata} (${f.from_iata})`,
        `${f.to?.city || f.to_iata} (${f.to_iata})`,
        Math.round(f.distance_km),
        f.duration_min ?? '',
        f.price,
        f.currency,
        f.cabin || 'economy',
      ]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skyhistory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!account?.scanToken) {
      setUnresolved([]);
      return;
    }
    const controller = new AbortController();
    setReviewLoading(true);
    fetchUnresolvedFlights({ account, signal: controller.signal })
      .then((items) => setUnresolved(items))
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        setReviewError(err.message || 'Failed to load unresolved tickets');
      })
      .finally(() => setReviewLoading(false));
    return () => controller.abort();
  }, [account?.scanToken]);

  const onResolveUnresolved = async (item, patch) => {
    setReviewError('');
    const data = await resolveUnresolvedFlight({
      account,
      unresolvedId: item.id,
      patch,
    });
    setUnresolved(data.items);
    if (Array.isArray(data.flights)) setFlights(data.flights);
  };

  const onIgnoreUnresolved = async (item) => {
    setReviewError('');
    const items = await ignoreUnresolvedFlight({
      account,
      unresolvedId: item.id,
    });
    setUnresolved(items);
  };

  const onUpdateFlight = async (flight, patch) => {
    if (!account?.scanToken) throw new Error('Not connected');
    const next = await updateFlight({ account, flightId: flight.id, patch });
    if (Array.isArray(next)) setFlights(next);
  };

  const onDeleteFlight = async (flight) => {
    if (!account?.scanToken) throw new Error('Not connected');
    const next = await deleteFlight({ account, flightId: flight.id });
    if (Array.isArray(next)) setFlights(next);
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <p className="label">Library</p>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">All your tickets</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {formatNumber(stats.totals.flights)} flights · {formatKm(stats.totals.distance_km)} ·{' '}
            {formatCurrency(stats.totals.spend_usd, 'USD', { compact: true })} total
          </p>
        </div>
        <button onClick={exportCsv} className="btn-soft text-sm">
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </motion.div>

      <ReviewPanel
        loading={reviewLoading}
        error={reviewError}
        unresolved={unresolved}
        suspect={suspectFlights}
        accountEmail={account?.email}
        canEdit={Boolean(account?.scanToken)}
        onResolveUnresolved={onResolveUnresolved}
        onIgnoreUnresolved={onIgnoreUnresolved}
        onUpdateFlight={onUpdateFlight}
        onDeleteFlight={onDeleteFlight}
      />

      {stats.flights.length === 0 ? (
        <div className="card grid place-items-center px-6 py-20 text-center">
          <TicketIcon className="mb-3 h-10 w-10 text-ink-dim" />
          <p className="text-sm text-ink-muted">No tickets parsed yet.</p>
        </div>
      ) : (
        <TicketList
          flights={stats.flights}
          initialPageSize={20}
          accountEmail={account?.email}
          canEdit={Boolean(account?.scanToken)}
          onUpdateFlight={onUpdateFlight}
          onDeleteFlight={onDeleteFlight}
        />
      )}
    </div>
  );
}

function ReviewPanel({
  loading,
  error,
  unresolved,
  suspect,
  accountEmail,
  canEdit,
  onResolveUnresolved,
  onIgnoreUnresolved,
  onUpdateFlight,
  onDeleteFlight,
}) {
  const total = unresolved.length + suspect.length;
  if (!loading && !error && total === 0) return null;
  return (
    <section className="card space-y-3 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="label">Needs your review</p>
          <h2 className="font-display text-lg font-semibold">Tickets to confirm or fix</h2>
          <p className="text-xs text-ink-muted">
            Anything where the parser was unsure (unknown airline / date) or looks like a duplicate.
            Open the email, fix the fields, save — or delete it.
          </p>
        </div>
        <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
          {loading ? 'Loading…' : `${total} pending`}
        </span>
      </div>
      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}
      {loading ? (
        <div className="rounded-xl border border-line/70 bg-bg-soft/40 px-3 py-6 text-center text-sm text-ink-muted">
          Loading unresolved emails...
        </div>
      ) : (
        <div className="space-y-3">
          {unresolved.map((item) => (
            <UnresolvedRow
              key={`u:${item.id}`}
              item={item}
              accountEmail={accountEmail}
              onResolve={onResolveUnresolved}
              onIgnore={onIgnoreUnresolved}
            />
          ))}
          {suspect.map(({ flight, issues }) => (
            <SuspectFlightRow
              key={`s:${flight.id}`}
              flight={flight}
              issues={issues}
              accountEmail={accountEmail}
              canEdit={canEdit}
              onUpdate={onUpdateFlight}
              onDelete={onDeleteFlight}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function UnresolvedRow({ item, accountEmail, onResolve, onIgnore }) {
  const [airline, setAirline] = useState(String(item.airline || '').toUpperCase().slice(0, 2));
  const [flightNumber, setFlightNumber] = useState(extractDigits(item.flight_number));
  const [fromIata, setFromIata] = useState(String(item.from_iata || '').toUpperCase());
  const [toIata, setToIata] = useState(String(item.to_iata || '').toUpperCase());
  const [departureLocal, setDepartureLocal] = useState(toLocalInput(item.departure_date));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr('');
    setBusy(true);
    try {
      const depIso = departureLocal ? new Date(departureLocal).toISOString() : null;
      await onResolve(item, {
        airline: airline.trim().toUpperCase(),
        flight_number: `${airline.trim().toUpperCase()} ${String(flightNumber || '').trim()}`,
        from_iata: fromIata.trim().toUpperCase(),
        to_iata: toIata.trim().toUpperCase(),
        departure_date: depIso,
      });
    } catch (e) {
      setErr(e.message || 'Failed to resolve');
    } finally {
      setBusy(false);
    }
  };

  const ignore = async () => {
    setErr('');
    setBusy(true);
    try {
      await onIgnore(item);
    } catch (e) {
      setErr(e.message || 'Failed to ignore');
    } finally {
      setBusy(false);
    }
  };

  const link = emailLinkForUnresolved(item, accountEmail);

  return (
    <article className="rounded-xl border border-line bg-bg-soft/40 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.subject || 'No subject'}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {item.source?.toUpperCase()} · {formatDate(item.received_at)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="amber">unparsed</Badge>
          {(item.reason_codes || []).map((r) => (
            <Badge key={r}>{prettyReason(r)}</Badge>
          ))}
        </div>
      </div>

      <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-ink-muted">
        {item.body_snippet || 'No body preview'}
      </p>

      {link && <OpenEmailLink href={link} label="Open this email" />}

      <FieldsGrid
        airline={airline}
        flightNumber={flightNumber}
        fromIata={fromIata}
        toIata={toIata}
        departureLocal={departureLocal}
        setAirline={setAirline}
        setFlightNumber={setFlightNumber}
        setFromIata={setFromIata}
        setToIata={setToIata}
        setDepartureLocal={setDepartureLocal}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={submit} disabled={busy} className="btn-soft text-xs">
          {busy ? 'Saving…' : 'Save as ticket'}
        </button>
        <button onClick={ignore} disabled={busy} className="btn-ghost text-xs">
          Ignore
        </button>
        {err && <span className="text-xs text-red-300">{err}</span>}
      </div>
    </article>
  );
}

function SuspectFlightRow({ flight, issues, accountEmail, canEdit, onUpdate, onDelete }) {
  const [airline, setAirline] = useState(extractCarrierFor(flight));
  const [flightNumber, setFlightNumber] = useState(extractDigits(flight.flight_number));
  const [fromIata, setFromIata] = useState(String(flight.from_iata || '').toUpperCase());
  const [toIata, setToIata] = useState(String(flight.to_iata || '').toUpperCase());
  const [departureLocal, setDepartureLocal] = useState(toLocalInput(flight.departure_date));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const link = emailLinkForFlight(flight, accountEmail);

  const save = async () => {
    setErr('');
    setBusy(true);
    try {
      const depIso = departureLocal ? new Date(departureLocal).toISOString() : null;
      await onUpdate(flight, {
        airline: airline.trim().toUpperCase(),
        flight_number: `${airline.trim().toUpperCase()} ${String(flightNumber || '').trim()}`,
        from_iata: fromIata.trim().toUpperCase(),
        to_iata: toIata.trim().toUpperCase(),
        departure_date: depIso,
      });
    } catch (e) {
      setErr(e.message || 'Failed to save');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm('Delete this ticket from your history?')) return;
    setErr('');
    setBusy(true);
    try {
      await onDelete(flight);
    } catch (e) {
      setErr(e.message || 'Failed to delete');
      setBusy(false);
    }
  };

  return (
    <article className="rounded-xl border border-line bg-bg-soft/40 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {flight.raw_subject || `${flight.from_iata} → ${flight.to_iata}`}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {(flight.source || 'gmail').toUpperCase()} ·{' '}
            {formatDate(flight.departure_date)} · {flight.from_iata} → {flight.to_iata}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="amber">saved · review</Badge>
          {issues.map((r) => (
            <Badge key={r}>{prettyIssue(r)}</Badge>
          ))}
        </div>
      </div>

      {link && <OpenEmailLink href={link} label="Open original email" />}

      <FieldsGrid
        airline={airline}
        flightNumber={flightNumber}
        fromIata={fromIata}
        toIata={toIata}
        departureLocal={departureLocal}
        setAirline={setAirline}
        setFlightNumber={setFlightNumber}
        setFromIata={setFromIata}
        setToIata={setToIata}
        setDepartureLocal={setDepartureLocal}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button onClick={save} disabled={busy || !canEdit} className="btn-soft text-xs">
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        <button onClick={remove} disabled={busy || !canEdit} className="btn-ghost text-xs text-red-200 hover:!bg-red-500/10">
          Delete
        </button>
        {!canEdit && (
          <span className="text-xs text-ink-muted">
            Reconnect Gmail/iCloud to edit saved tickets.
          </span>
        )}
        {err && <span className="text-xs text-red-300">{err}</span>}
      </div>
    </article>
  );
}

function FieldsGrid({
  airline,
  flightNumber,
  fromIata,
  toIata,
  departureLocal,
  setAirline,
  setFlightNumber,
  setFromIata,
  setToIata,
  setDepartureLocal,
}) {
  return (
    <div className="mt-3 grid gap-2 sm:grid-cols-5">
      <input
        className="input h-[38px]"
        value={airline}
        onChange={(e) => setAirline(e.target.value.toUpperCase().slice(0, 2))}
        placeholder="Airline (LH)"
      />
      <input
        className="input h-[38px]"
        value={flightNumber}
        onChange={(e) => setFlightNumber(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
        placeholder="Flight no (410)"
      />
      <input
        className="input h-[38px]"
        value={fromIata}
        onChange={(e) => setFromIata(e.target.value.toUpperCase().slice(0, 3))}
        placeholder="From (FRA)"
      />
      <input
        className="input h-[38px]"
        value={toIata}
        onChange={(e) => setToIata(e.target.value.toUpperCase().slice(0, 3))}
        placeholder="To (VIE)"
      />
      <input
        type="datetime-local"
        className="input h-[38px]"
        value={departureLocal}
        onChange={(e) => setDepartureLocal(e.target.value)}
      />
    </div>
  );
}

function OpenEmailLink({ href, label }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="mt-2 inline-flex items-center gap-1 text-xs text-brand-300 underline-offset-2 hover:underline"
    >
      <ExternalLink className="h-3 w-3" /> {label}
    </a>
  );
}

function Badge({ children, tone = 'neutral' }) {
  const cls =
    tone === 'amber'
      ? 'border-amber-400/30 bg-amber-500/10 text-amber-200'
      : 'border-line bg-bg-soft/60 text-ink-muted';
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider ${cls}`}>
      {children}
    </span>
  );
}

function extractCarrierFor(flight) {
  const a = String(flight?.airline || '').trim().toUpperCase();
  if (/^[A-Z0-9]{2}$/.test(a) && a !== 'XX' && !/^\d{2}$/.test(a)) return a;
  const fn = String(flight?.flight_number || '').toUpperCase();
  const m = fn.match(/^([A-Z]{2}|[A-Z]\d|\d[A-Z])\b/);
  return m && m[1] !== 'XX' ? m[1] : '';
}

function extractDigits(value) {
  const m = String(value || '').match(/\d{1,4}/);
  return m ? m[0] : '';
}

function toLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

function prettyReason(code) {
  const map = {
    missing_route: 'route missing',
    missing_airline: 'airline missing',
    missing_flight_number: 'flight no missing',
    missing_departure_date: 'date missing',
  };
  return map[code] || code;
}

function prettyIssue(code) {
  const map = {
    unknown_airline: 'unknown airline',
    weak_flight_number: 'weak flight no',
    possible_duplicate: 'possible duplicate',
    missing_route: 'route missing',
  };
  return map[code] || code;
}
