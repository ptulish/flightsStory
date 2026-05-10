import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  Search,
  Filter,
  Plane,
  ChevronDown,
  ChevronUp,
  X,
  ExternalLink,
  Pencil,
  Trash2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getAirport } from '../data/airports';
import { getAirline } from '../data/airlines';
import {
  formatCurrency,
  formatDate,
  formatTime,
  formatDuration,
  formatKm,
} from '../utils/format';
import {
  displayFlightNumberDigits,
  formatFlightNumberForTicket,
  resolveCarrierCode,
} from '../utils/flightDisplay';
import { emailLinkForFlight } from '../utils/emailLinks';

export default function TicketList({
  flights,
  initialPageSize = 12,
  showFilters = true,
  compact = false,
  accountEmail,
  canEdit = false,
  onUpdateFlight,
  onDeleteFlight,
}) {
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('all');
  const [airline, setAirline] = useState('all');
  const [cabin, setCabin] = useState('all');
  const [sort, setSort] = useState({ key: 'date', dir: 'desc' });
  const [pageSize, setPageSize] = useState(initialPageSize);

  const years = useMemo(
    () => Array.from(new Set(flights.map((f) => f.year))).sort((a, b) => b - a),
    [flights],
  );
  const airlines = useMemo(() => {
    const set = new Map();
    flights.forEach((f) => {
      const code = f.airline_info?.code ?? resolveCarrierCode(f);
      const name = f.airline_info?.name ?? getAirline(code).name;
      set.set(code, name);
    });
    return [...set.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [flights]);
  const cabins = useMemo(
    () => Array.from(new Set(flights.map((f) => f.cabin || 'economy'))),
    [flights],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return flights.filter((f) => {
      if (year !== 'all' && f.year !== Number(year)) return false;
      if (airline !== 'all' && (f.airline_info?.code ?? resolveCarrierCode(f)) !== airline)
        return false;
      if (cabin !== 'all' && (f.cabin || 'economy') !== cabin) return false;
      if (!needle) return true;
      const haystack = [
        f.from_iata,
        f.to_iata,
        f.from?.city,
        f.from?.country,
        f.to?.city,
        f.to?.country,
        f.airline_info?.name,
        f.airline_info?.code,
        f.flight_number,
        displayFlightNumberDigits(f),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [flights, search, year, airline, cabin]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const cmp = COMPARATORS[sort.key];
    arr.sort((a, b) => (sort.dir === 'asc' ? cmp(a, b) : cmp(b, a)));
    return arr;
  }, [filtered, sort]);

  const visible = sorted.slice(0, pageSize);
  const hasMore = sorted.length > visible.length;

  const reset = () => {
    setSearch('');
    setYear('all');
    setAirline('all');
    setCabin('all');
  };

  const filtersActive = year !== 'all' || airline !== 'all' || cabin !== 'all' || search;

  return (
    <div className="card overflow-hidden">
      {showFilters && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line/70 p-4">
          <label className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <input
              className="input pl-9"
              placeholder="Search by city, country, airline, IATA…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <Select value={year} onChange={setYear} icon={Calendar} ariaLabel="Year">
            <option value="all">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
          <Select value={airline} onChange={setAirline} icon={Plane} ariaLabel="Airline">
            <option value="all">All airlines</option>
            {airlines.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </Select>
          <Select value={cabin} onChange={setCabin} icon={Filter} ariaLabel="Cabin">
            <option value="all">All cabins</option>
            {cabins.map((c) => (
              <option key={c} value={c}>
                {capitalize(c)}
              </option>
            ))}
          </Select>
          {filtersActive && (
            <button
              onClick={reset}
              className="btn-soft h-[38px] !px-3 text-xs"
              title="Clear filters"
            >
              <X className="h-3.5 w-3.5" /> Clear
            </button>
          )}
        </div>
      )}

      {/* Header row (table-style) */}
      <div className="hidden grid-cols-12 gap-3 border-b border-line/70 px-5 py-2 text-[11px] uppercase tracking-wider text-ink-dim md:grid">
        <SortHeader col="date" label="Date" sort={sort} setSort={setSort} className="col-span-2" />
        <SortHeader col="airline" label="Airline" sort={sort} setSort={setSort} className="col-span-2" />
        <span className="col-span-4">Route</span>
        <SortHeader col="distance" label="Distance" sort={sort} setSort={setSort} className="col-span-2 text-right" />
        <SortHeader col="price" label="Price" sort={sort} setSort={setSort} className="col-span-2 text-right" />
      </div>

      <div className="divide-y divide-line/60">
        <AnimatePresence initial={false}>
          {visible.map((f, idx) => (
            <Row
              key={f.id}
              flight={f}
              index={idx}
              compact={compact}
              accountEmail={accountEmail}
              canEdit={canEdit}
              onUpdateFlight={onUpdateFlight}
              onDeleteFlight={onDeleteFlight}
            />
          ))}
        </AnimatePresence>
        {sorted.length === 0 && (
          <div className="grid place-items-center px-6 py-16 text-center">
            <Plane className="mb-2 h-10 w-10 text-ink-dim" />
            <p className="text-sm text-ink-muted">
              No flights match these filters.
            </p>
            {filtersActive && (
              <button onClick={reset} className="btn-ghost mt-3 text-xs">
                Reset filters
              </button>
            )}
          </div>
        )}
      </div>

      {hasMore && (
        <div className="border-t border-line/70 p-3 text-center">
          <button
            onClick={() => setPageSize((s) => s + 24)}
            className="btn-soft text-xs"
          >
            Show {Math.min(24, sorted.length - visible.length)} more · {sorted.length - visible.length} hidden
          </button>
        </div>
      )}

      {!showFilters && hasMore && false /* preview only */}
    </div>
  );
}

function Row({ flight, index, compact, accountEmail, canEdit, onUpdateFlight, onDeleteFlight }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const from = flight.from || getAirport(flight.from_iata);
  const to = flight.to || getAirport(flight.to_iata);
  const airline = flight.airline_info || getAirline(resolveCarrierCode(flight));
  const flightNo = formatFlightNumberForTicket(flight);
  const emailLink = emailLinkForFlight(flight, accountEmail);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, delay: Math.min(0.04 * index, 0.4) }}
      className="group"
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid w-full grid-cols-12 items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.02] sm:px-5"
      >
        {/* Mobile + 2-col date */}
        <div className="col-span-7 flex items-center gap-3 md:col-span-2">
          <span
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-semibold text-white"
            style={{ backgroundColor: airline.color }}
          >
            {airline.code}
          </span>
          <div className="min-w-0 md:hidden">
            <p className="truncate text-sm font-medium">
              {from?.city || flight.from_iata} → {to?.city || flight.to_iata}
            </p>
            <p className="truncate text-xs text-ink-muted">
              {formatDate(flight.departure_date)}
              {flight.departure_date ? ` · ${formatTime(flight.departure_date)}` : ''}
            </p>
            <p className="truncate text-sm font-medium leading-tight">{airline.name}</p>
            <p className="font-mono text-xs text-ink-muted tabular-nums">{flightNo}</p>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium tabular-nums">
              {formatDate(flight.departure_date)}
            </p>
            <p className="text-xs text-ink-muted">{formatTime(flight.departure_date)}</p>
          </div>
        </div>

        {/* Airline (md+) */}
        <div className="col-span-2 hidden flex-col justify-center md:flex">
          <p className="truncate text-sm font-medium leading-snug">{airline.name}</p>
          <p className="font-mono text-xs text-ink-muted tabular-nums">{flightNo}</p>
        </div>

        {/* Route (md+) */}
        <div className="col-span-4 hidden items-center gap-3 md:flex">
          <RouteMini from={from?.iata || flight.from_iata} to={to?.iata || flight.to_iata} />
          <div className="min-w-0">
            <p className="truncate text-sm">
              {from?.city || flight.from_iata}
              <span className="mx-1 text-ink-dim">→</span>
              {to?.city || flight.to_iata}
            </p>
            <p className="truncate text-xs text-ink-muted">
              {from?.country} · {to?.country}
            </p>
          </div>
        </div>

        {/* Distance */}
        <div className="col-span-2 hidden text-right md:block">
          <p className="text-sm tabular-nums">{formatKm(flight.distance_km)}</p>
          <p className="text-xs text-ink-muted">{formatDuration(flight.duration_min)}</p>
        </div>

        {/* Price */}
        <div className="col-span-5 flex flex-col items-end justify-center md:col-span-2">
          <p className="text-sm font-semibold tabular-nums">
            {formatCurrency(flight.price, flight.currency)}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-ink-dim">
            {flight.cabin || 'economy'}
          </p>
        </div>
      </button>

      <AnimatePresence>
        {open && !compact && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-line/40 bg-bg-soft/40 px-5 py-4"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Detail label="Subject">
                <p className="truncate font-mono text-xs text-ink-muted">
                  {flight.raw_subject}
                </p>
                {emailLink && (
                  <a
                    href={emailLink}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-brand-300 underline-offset-2 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" /> Open in Gmail
                  </a>
                )}
              </Detail>
              <Detail label="From">
                <p className="text-sm">
                  {from?.name} · <span className="font-mono">{from?.iata}</span>
                </p>
                <p className="text-xs text-ink-muted">
                  {from?.city}, {from?.country}
                </p>
              </Detail>
              <Detail label="To">
                <p className="text-sm">
                  {to?.name} · <span className="font-mono">{to?.iata}</span>
                </p>
                <p className="text-xs text-ink-muted">
                  {to?.city}, {to?.country}
                </p>
              </Detail>
            </div>

            {canEdit && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line/40 pt-3">
                {!editing && (
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="btn-ghost text-xs"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    if (!window.confirm('Delete this ticket from your history?')) return;
                    try {
                      await onDeleteFlight?.(flight);
                    } catch (e) {
                      window.alert(e?.message || 'Failed to delete');
                    }
                  }}
                  className="btn-ghost text-xs text-red-200 hover:!bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            )}

            {canEdit && editing && (
              <InlineEditor
                flight={flight}
                onCancel={() => setEditing(false)}
                onSave={async (patch) => {
                  await onUpdateFlight?.(flight, patch);
                  setEditing(false);
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function RouteMini({ from, to }) {
  return (
    <div className="grid h-8 w-20 place-items-center rounded-lg border border-line/60 bg-bg-soft/40 text-[10px] font-mono">
      <div className="flex items-center gap-1">
        <span>{from}</span>
        <ArrowRight className="h-3 w-3 text-ink-dim" />
        <span>{to}</span>
      </div>
    </div>
  );
}

function Detail({ label, children }) {
  return (
    <div>
      <p className="label">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Select({ value, onChange, children, icon: Icon, ariaLabel }) {
  return (
    <label className="relative inline-flex h-[38px] items-center">
      {Icon && <Icon className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-ink-muted" />}
      <select
        aria-label={ariaLabel}
        className="input h-[38px] !w-auto cursor-pointer pl-8 pr-9 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

function SortHeader({ col, label, sort, setSort, className = '' }) {
  const active = sort.key === col;
  const Icon = sort.dir === 'asc' ? ChevronUp : ChevronDown;
  return (
    <button
      onClick={() =>
        setSort((s) =>
          s.key === col
            ? { key: col, dir: s.dir === 'asc' ? 'desc' : 'asc' }
            : { key: col, dir: 'desc' },
        )
      }
      className={`flex items-center gap-1 hover:text-ink ${active ? 'text-ink' : ''} ${className}`}
    >
      <span>{label}</span>
      {active && <Icon className="h-3 w-3" />}
    </button>
  );
}

const COMPARATORS = {
  date: (a, b) => new Date(a.departure_date) - new Date(b.departure_date),
  airline: (a, b) =>
    (a.airline_info?.name || a.airline).localeCompare(b.airline_info?.name || b.airline),
  distance: (a, b) => (a.distance_km || 0) - (b.distance_km || 0),
  price: (a, b) => (a.price_usd || 0) - (b.price_usd || 0),
};

function capitalize(s) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

function InlineEditor({ flight, onSave, onCancel }) {
  const [airline, setAirline] = useState(carrierForEditor(flight));
  const [flightNumber, setFlightNumber] = useState(digitsForEditor(flight.flight_number));
  const [fromIata, setFromIata] = useState(String(flight.from_iata || '').toUpperCase());
  const [toIata, setToIata] = useState(String(flight.to_iata || '').toUpperCase());
  const [departureLocal, setDepartureLocal] = useState(toLocalInputValue(flight.departure_date));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr('');
    setBusy(true);
    try {
      const depIso = departureLocal ? new Date(departureLocal).toISOString() : null;
      await onSave({
        airline: airline.trim().toUpperCase(),
        flight_number: `${airline.trim().toUpperCase()} ${String(flightNumber || '').trim()}`,
        from_iata: fromIata.trim().toUpperCase(),
        to_iata: toIata.trim().toUpperCase(),
        departure_date: depIso,
      });
    } catch (e) {
      setErr(e?.message || 'Failed to save');
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-line/60 bg-bg-soft/60 p-3">
      <div className="grid gap-2 sm:grid-cols-5">
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
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={submit} disabled={busy} className="btn-soft text-xs">
          {busy ? 'Saving…' : 'Save'}
        </button>
        <button onClick={onCancel} disabled={busy} className="btn-ghost text-xs">
          Cancel
        </button>
        {err && <span className="text-xs text-red-300">{err}</span>}
      </div>
    </div>
  );
}

function carrierForEditor(flight) {
  const a = String(flight?.airline || '').trim().toUpperCase();
  if (/^[A-Z0-9]{2}$/.test(a) && a !== 'XX' && !/^\d{2}$/.test(a)) return a;
  const fn = String(flight?.flight_number || '').toUpperCase();
  const m = fn.match(/^([A-Z]{2}|[A-Z]\d|\d[A-Z])\b/);
  return m && m[1] !== 'XX' ? m[1] : '';
}

function digitsForEditor(value) {
  const m = String(value || '').match(/\d{1,4}/);
  return m ? m[0] : '';
}

function toLocalInputValue(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}
