import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, MailSearch, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';
import { useSession } from '../state/session.jsx';
import { fetchDemo, fetchGmail, fetchIcloud } from '../api/flights';
import { getAirport } from '../data/airports';
import { getAirline } from '../data/airlines';
import { formatDate } from '../utils/format';

const STAGE_LIST = [
  { key: 'connect', label: 'Connecting', icon: Loader2 },
  { key: 'index', label: 'Indexing', icon: MailSearch },
  { key: 'filter', label: 'Filtering', icon: Sparkles },
  { key: 'fetch', label: 'Fetching', icon: Plane },
  { key: 'parse', label: 'AI parsing', icon: Sparkles },
  { key: 'save', label: 'Saving', icon: CheckCircle2 },
];

export default function ScannerProgress() {
  const navigate = useNavigate();
  const { source, account, setFlights } = useSession();
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [lastEventAt, setLastEventAt] = useState(() => Date.now());
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [progress, setProgress] = useState({
    percent: 0,
    stageKey: 'connect',
    stageLabel: 'Securely connecting…',
    sourceLabel: '',
    messagesScanned: 0,
    ticketsFound: 0,
    stageStep: 0,
    stageTotalSteps: 0,
  });
  const [recentTickets, setRecentTickets] = useState([]);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current || !source) return;
    startedRef.current = true;
    setStartedAt(Date.now());
    setLastEventAt(Date.now());

    const controller = new AbortController();
    const fn =
      source === 'gmail' ? fetchGmail : source === 'icloud' ? fetchIcloud : fetchDemo;

    const lastSeenRef = { current: 0 };

    fn({
      signal: controller.signal,
      account,
      onProgress: (p) => {
        setProgress(p);
        setLastEventAt(Date.now());
        if (p.latestDiscovery) {
          const item = p.latestDiscovery;
          const key = `${item.airline}-${item.from_iata}-${item.to_iata}-${item.departure_date}`;
          setRecentTickets((prev) => {
            const next = [item, ...prev.filter((x) => `${x.airline}-${x.from_iata}-${x.to_iata}-${x.departure_date}` !== key)];
            return next.slice(0, 6);
          });
        }
        if (p.ticketsFound > lastSeenRef.current) {
          lastSeenRef.current = p.ticketsFound;
        }
      },
    })
      .then((flights) => {
        setFlights(flights);
        // Show last few discovered tickets briefly.
        const last = flights.slice(-6).reverse();
        setRecentTickets(last);
        setTimeout(() => navigate('/dashboard', { replace: true }), 750);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        console.error(err);
      });

    return () => controller.abort();
  }, [source, account, setFlights, navigate]);

  useEffect(() => {
    const t = setInterval(() => setNowTs(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const isActive = progress.stageKey !== 'done';
  const elapsedSec = Math.max(0, Math.floor((nowTs - startedAt) / 1000));
  const sinceLastEventSec = Math.max(0, Math.floor((nowTs - lastEventAt) / 1000));

  return (
    <div className="mx-auto max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-elevated relative overflow-hidden p-6 sm:p-8"
      >
        <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[120%] -translate-x-1/2 bg-aurora opacity-60 blur-2xl" />

        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="label">{progress.sourceLabel || 'Scanner'}</p>
              <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
                {progress.stageLabel}
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                We're piecing together your travel timeline. This usually takes
                15–60 seconds depending on inbox size.
              </p>
              <LiveScanStatus
                active={isActive}
                stageKey={progress.stageKey}
                elapsedSec={elapsedSec}
                sinceLastEventSec={sinceLastEventSec}
                stageStep={progress.stageStep}
                stageTotalSteps={progress.stageTotalSteps}
              />
            </div>
            <Counter value={progress.percent} />
          </div>

          <ProgressBar percent={progress.percent} active={isActive} />

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <StatChip label="Messages scanned" value={progress.messagesScanned.toLocaleString()} />
            <StatChip label="Tickets found" value={progress.ticketsFound} accent />
            <StatChip label="Stage" value={stageNumber(progress.stageKey)} />
          </div>

          <Stages current={progress.stageKey} />

          <PaperPlanePath percent={progress.percent} />

          <RecentDiscoveries
            stageKey={progress.stageKey}
            ticketsFound={progress.ticketsFound}
            stageStep={progress.stageStep}
            recent={recentTickets}
          />
        </div>
      </motion.div>
    </div>
  );
}

function ProgressBar({ percent, active }) {
  return (
    <div className="relative mt-6 h-2 w-full overflow-hidden rounded-full bg-white/5">
      <motion.div
        className="h-full bg-gradient-to-r from-brand-500 via-accent-violet to-accent-cyan"
        animate={{ width: `${percent}%` }}
        transition={{ ease: 'linear', duration: 0.4 }}
      />
      {active && (
        <motion.div
          className="absolute inset-y-0 h-2 w-1/3 bg-gradient-to-r from-transparent via-white/35 to-transparent"
          animate={{ x: ['-40%', '340%'] }}
          transition={{ duration: 1.3, repeat: Infinity, ease: 'linear' }}
        />
      )}
    </div>
  );
}

function Counter({ value }) {
  return (
    <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl border border-line bg-bg-soft/70 font-display text-2xl tabular-nums">
      {Math.floor(value)}
      <span className="-mt-1 text-xs text-ink-muted">%</span>
    </div>
  );
}

function StatChip({ label, value, accent }) {
  return (
    <div className="card flex items-center justify-between p-4">
      <p className="label">{label}</p>
      <p
        className={`font-display text-xl font-semibold tabular-nums ${
          accent ? 'text-gradient' : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Stages({ current }) {
  const idx = STAGE_LIST.findIndex((s) => s.key === current);
  return (
    <div className="mt-6 grid gap-2 sm:grid-cols-6">
      {STAGE_LIST.map((s, i) => {
        const Icon = s.icon;
        const state = i < idx ? 'done' : i === idx ? 'active' : 'pending';
        return (
          <div
            key={s.key}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
              state === 'pending'
                ? 'border-line/60 text-ink-dim'
                : state === 'active'
                  ? 'border-brand-400/40 bg-brand-500/10 text-ink shadow-glow'
                  : 'border-emerald-400/30 bg-emerald-400/5 text-emerald-300'
            }`}
          >
            <Icon
              className={`h-3.5 w-3.5 ${
                state === 'active' && current === 'connect'
                  ? 'animate-spin'
                  : state === 'active'
                    ? 'animate-pulse'
                    : ''
              }`}
            />
            <span>{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function LiveScanStatus({ active, stageKey, elapsedSec, sinceLastEventSec, stageStep, stageTotalSteps }) {
  if (!active) return null;
  const busyLabel =
    stageKey === 'fetch'
      ? 'Fetching emails'
      : stageKey === 'filter'
        ? 'Filtering candidates'
        : stageKey === 'parse'
          ? 'Parsing flights with AI'
          : 'Processing';
  const canShowEmailOrdinal =
    (stageKey === 'fetch' || stageKey === 'parse') &&
    Number.isFinite(stageTotalSteps) &&
    stageTotalSteps > 1;
  const emailCurrent = Math.min(stageTotalSteps, Math.max(1, stageStep || 1));

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
      <span className="inline-flex items-center gap-2 rounded-full border border-line/70 bg-bg-soft/70 px-2.5 py-1">
        <motion.span
          className="h-1.5 w-1.5 rounded-full bg-emerald-300"
          animate={{ opacity: [0.35, 1, 0.35], scale: [0.9, 1.15, 0.9] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
        />
        {busyLabel}
      </span>
      <span className="rounded-full border border-line/60 bg-bg-soft/50 px-2.5 py-1">
        elapsed {formatDurationShort(elapsedSec)}
      </span>
      <span className="rounded-full border border-line/60 bg-bg-soft/50 px-2.5 py-1">
        last update {sinceLastEventSec}s ago
      </span>
      {canShowEmailOrdinal && (
        <span className="rounded-full border border-brand-400/30 bg-brand-500/10 px-2.5 py-1 text-ink">
          email {emailCurrent.toLocaleString()} / {stageTotalSteps.toLocaleString()}
        </span>
      )}
    </div>
  );
}

function stageNumber(key) {
  const i = STAGE_LIST.findIndex((s) => s.key === key);
  return `${Math.max(1, i + 1)} / ${STAGE_LIST.length}`;
}

function PaperPlanePath({ percent }) {
  return (
    <div className="relative mt-8 h-28">
      <svg viewBox="0 0 800 100" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="ppg" x1="0" x2="1">
            <stop offset="0" stopColor="#5e85ff" stopOpacity=".0" />
            <stop offset="0.4" stopColor="#5e85ff" />
            <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M 20 80 Q 200 -10 400 50 T 780 30"
          fill="none"
          stroke="url(#ppg)"
          strokeWidth="2"
          strokeDasharray="4 8"
          className="opacity-70"
        />
      </svg>
      <motion.div
        className="absolute top-0 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-accent-violet text-white shadow-glow"
        initial={false}
        animate={{
          left: `calc(${Math.min(98, Math.max(2, percent))}% - 20px)`,
        }}
        transition={{ ease: 'linear', duration: 0.4 }}
        style={{ top: planeY(percent) }}
      >
        <Plane className="h-5 w-5 -rotate-12" />
      </motion.div>
    </div>
  );
}

function planeY(p) {
  const t = p / 100;
  // approx Q-curve y: cheap visual swoop
  return 40 + 30 * Math.sin(t * Math.PI * 1.6) - 20 * t;
}

function formatDurationShort(totalSec) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function RecentDiscoveries({ stageKey, ticketsFound, stageStep, recent }) {
  const showTicker = stageKey === 'fetch' || stageKey === 'parse' || stageKey === 'save';
  const fakeFeed = useFakeTicker(ticketsFound, stageStep, showTicker);

  if (!showTicker && recent.length === 0) return null;
  const items = recent.length ? recent : fakeFeed;

  return (
    <div className="mt-8">
      <p className="label">Latest discoveries</p>
      <div className="mt-3 grid gap-2">
        <AnimatePresence initial={false}>
          {items.slice(0, 5).map((f, i) => (
            <motion.div
              key={f.id || `fk-${i}-${f.from_iata}-${f.to_iata}`}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-center gap-3 rounded-xl border border-line bg-bg-soft/60 px-3 py-2 text-sm"
            >
              <span
                className="grid h-7 w-7 place-items-center rounded-lg text-xs font-semibold text-white"
                style={{ backgroundColor: getAirline(f.airline).color }}
              >
                {f.airline}
              </span>
              <div className="flex flex-1 items-center gap-2">
                <span className="font-mono text-xs">{f.from_iata}</span>
                <Plane className="h-3 w-3 -rotate-90 text-ink-muted" />
                <span className="font-mono text-xs">{f.to_iata}</span>
                <span className="ml-1 hidden truncate text-xs text-ink-muted sm:inline">
                  · {getAirport(f.from_iata)?.city} → {getAirport(f.to_iata)?.city}
                </span>
              </div>
              <span className="hidden text-xs text-ink-muted md:inline">
                {formatDate(f.departure_date)}
              </span>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/5 px-2 py-0.5 text-xs text-emerald-300">
                parsed
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Synthesizes a small ticker of plausible-looking discoveries during scan.
function useFakeTicker(ticketsFound, stageStep, enabled) {
  const [pool] = useState(() => SAMPLE_FEED);
  return useMemo(() => {
    if (!enabled) return [];
    const n = Math.min(pool.length, Math.max(1, ((stageStep || 1) % pool.length) + 1));
    const start = Math.abs((ticketsFound || 0) + (stageStep || 0)) % pool.length;
    const rotated = [...pool.slice(start), ...pool.slice(0, start)];
    return rotated.slice(0, n).map((row, i) => ({ ...row, id: `live-${ticketsFound}-${stageStep}-${i}` }));
  }, [pool, ticketsFound, stageStep, enabled]);
}

const SAMPLE_FEED = [
  { airline: 'TK', from_iata: 'SVO', to_iata: 'IST', departure_date: '2024-04-21T22:30' },
  { airline: 'EK', from_iata: 'DXB', to_iata: 'SIN', departure_date: '2024-07-08T09:55' },
  { airline: 'S7', from_iata: 'DME', to_iata: 'AYT', departure_date: '2023-10-12T14:00' },
  { airline: 'KL', from_iata: 'AMS', to_iata: 'LHR', departure_date: '2024-04-22T18:10' },
  { airline: 'SU', from_iata: 'SVO', to_iata: 'LED', departure_date: '2023-04-15T08:30' },
];
