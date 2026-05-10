import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Ticket as TicketIcon, Download, AlertTriangle } from 'lucide-react';
import { useSession } from '../state/session.jsx';
import { computeStats } from '../utils/stats';
import TicketList from '../components/TicketList.jsx';
import { formatNumber, formatKm, formatCurrency } from '../utils/format';
import { formatFlightNumberForTicket } from '../utils/flightDisplay';
import {
  fetchUnresolvedFlights,
  ignoreUnresolvedFlight,
  resolveUnresolvedFlight,
} from '../api/flights';

export default function Tickets() {
  const { flights, account, setFlights } = useSession();
  const stats = useMemo(() => computeStats(flights), [flights]);
  const [unresolved, setUnresolved] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');

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

  const onResolve = async (item, patch) => {
    setReviewError('');
    const data = await resolveUnresolvedFlight({
      account,
      unresolvedId: item.id,
      patch,
    });
    setUnresolved(data.items);
    if (Array.isArray(data.flights)) setFlights(data.flights);
  };

  const onIgnore = async (item) => {
    setReviewError('');
    const items = await ignoreUnresolvedFlight({
      account,
      unresolvedId: item.id,
    });
    setUnresolved(items);
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

      <ManualReviewPanel
        loading={reviewLoading}
        error={reviewError}
        items={unresolved}
        onResolve={onResolve}
        onIgnore={onIgnore}
      />

      {stats.flights.length === 0 ? (
        <div className="card grid place-items-center px-6 py-20 text-center">
          <TicketIcon className="mb-3 h-10 w-10 text-ink-dim" />
          <p className="text-sm text-ink-muted">No tickets parsed yet.</p>
        </div>
      ) : (
        <TicketList flights={stats.flights} initialPageSize={20} />
      )}
    </div>
  );
}

function ManualReviewPanel({ loading, error, items, onResolve, onIgnore }) {
  if (!loading && !error && (!items || items.length === 0)) return null;
  return (
    <section className="card space-y-3 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="label">Manual review</p>
          <h2 className="font-display text-lg font-semibold">Unknown airline/date tickets</h2>
          <p className="text-xs text-ink-muted">
            If parser could not confirm airline or departure date, fix it here and save.
          </p>
        </div>
        <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-200">
          {loading ? 'Loading…' : `${items.length} pending`}
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
          {items.map((item) => (
            <ManualReviewRow
              key={item.id}
              item={item}
              onResolve={onResolve}
              onIgnore={onIgnore}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function ManualReviewRow({ item, onResolve, onIgnore }) {
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

  return (
    <article className="rounded-xl border border-line bg-bg-soft/40 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{item.subject || 'No subject'}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {item.source?.toUpperCase()} · {formatDate(item.received_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(item.reason_codes || []).map((r) => (
            <span
              key={r}
              className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-200"
            >
              {prettyReason(r)}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-ink-muted">{item.body_snippet || 'No body preview'}</p>

      {item.source === 'gmail' && item.subject && (
        <a
          href={`https://mail.google.com/mail/u/0/#search/${encodeURIComponent(item.subject)}`}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs text-brand-300 underline-offset-2 hover:underline"
        >
          <AlertTriangle className="h-3 w-3" /> Open matching email in Gmail
        </a>
      )}

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

      <div className="mt-3 flex items-center gap-2">
        <button onClick={submit} disabled={busy} className="btn-soft text-xs">
          {busy ? 'Saving...' : 'Save as ticket'}
        </button>
        <button onClick={ignore} disabled={busy} className="btn-ghost text-xs">
          Ignore
        </button>
        {err && <span className="text-xs text-red-300">{err}</span>}
      </div>
    </article>
  );
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
