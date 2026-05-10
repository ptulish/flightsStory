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

export default function TicketList({
  flights,
  initialPageSize = 12,
  showFilters = true,
  compact = false,
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
    flights.forEach((f) => set.set(f.airline, getAirline(f.airline).name));
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
      if (airline !== 'all' && f.airline !== airline) return false;
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
        f.flight_number,
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
            <Row key={f.id} flight={f} index={idx} compact={compact} />
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

function Row({ flight, index, compact }) {
  const [open, setOpen] = useState(false);
  const from = flight.from || getAirport(flight.from_iata);
  const to = flight.to || getAirport(flight.to_iata);
  const airline = flight.airline_info || getAirline(flight.airline);

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
              {formatDate(flight.departure_date)} · {airline.name}
            </p>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium tabular-nums">
              {formatDate(flight.departure_date)}
            </p>
            <p className="text-xs text-ink-muted">{formatTime(flight.departure_date)}</p>
          </div>
        </div>

        {/* Airline (md+) */}
        <div className="col-span-2 hidden md:block">
          <p className="truncate text-sm">{airline.name}</p>
          <p className="font-mono text-xs text-ink-muted">{flight.flight_number}</p>
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
