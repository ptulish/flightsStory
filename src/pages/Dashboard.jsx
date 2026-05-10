import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, RefreshCw } from 'lucide-react';
import { useSession } from '../state/session.jsx';
import { computeStats } from '../utils/stats';
import StatsGrid from '../components/StatsGrid.jsx';
import FlightMap from '../components/FlightMap.jsx';
import TicketList from '../components/TicketList.jsx';
import YearActivityChart from '../components/charts/YearActivityChart.jsx';
import TopAirlines from '../components/charts/TopAirlines.jsx';
import TopRoutes from '../components/charts/TopRoutes.jsx';
import CabinDonut from '../components/charts/CabinDonut.jsx';
import MonthHeatmap from '../components/charts/MonthHeatmap.jsx';
import MilestoneCards from '../components/charts/MilestoneCards.jsx';
import { labelForSource } from '../components/Layout.jsx';

export default function Dashboard() {
  const navigate = useNavigate();
  const { flights, account, source, scannedAt, startSession } = useSession();
  const stats = useMemo(() => computeStats(flights), [flights]);

  const recent = useMemo(() => [...stats.flights].reverse().slice(0, 6), [stats.flights]);

  const onRescan = () => {
    startSession(source, account);
    navigate('/scan');
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="card-elevated relative overflow-hidden p-6 sm:p-8"
      >
        <div className="pointer-events-none absolute -right-32 -top-24 h-72 w-72 rounded-full bg-brand-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-accent-violet/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="chip">
              <Sparkles className="h-3 w-3 text-accent-cyan" />
              {labelForSource(source)} · scanned {formatRelative(scannedAt)}
            </div>
            <h1 className="mt-3 font-display text-2xl font-semibold sm:text-3xl">
              {greeting()}, {account?.name || 'traveler'}.
            </h1>
            <p className="mt-1 max-w-2xl text-ink-muted">
              We found <span className="text-ink">{stats.totals.flights} flights</span> across{' '}
              <span className="text-ink">{stats.totals.countries} countries</span>. That's{' '}
              <span className="text-ink">{(stats.totals.distance_km / 40075).toFixed(2)} laps</span>{' '}
              around the planet.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={onRescan} className="btn-soft text-sm">
              <RefreshCw className="h-4 w-4" /> Rescan inbox
            </button>
            <button onClick={() => navigate('/tickets')} className="btn-primary text-sm">
              Browse all tickets
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.section>

      {/* Stats grid */}
      <StatsGrid stats={stats} />

      {/* Map + side metrics */}
      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <FlightMap stats={stats} height={520} />
        <div className="grid gap-4">
          <YearActivityChart data={stats.byYear} />
          <CabinDonut data={stats.byCabin} />
        </div>
      </div>

      {/* Airlines & routes */}
      <div className="grid gap-4 lg:grid-cols-2">
        <TopAirlines airlines={stats.airlines} />
        <TopRoutes routes={stats.routes} />
      </div>

      {/* Seasonality + milestones */}
      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <MonthHeatmap data={stats.byMonth} />
        <div className="grid gap-4">
          <MilestonesAside stats={stats} />
        </div>
      </div>

      <MilestoneCards stats={stats} />

      {/* Recent flights */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <div>
            <p className="label">Latest in your inbox</p>
            <h2 className="font-display text-xl font-semibold">Recent flights</h2>
          </div>
          <button
            onClick={() => navigate('/tickets')}
            className="text-sm text-brand-300 hover:text-brand-200"
          >
            See all →
          </button>
        </div>
        <TicketList flights={recent} showFilters={false} initialPageSize={6} compact />
      </section>
    </div>
  );
}

function MilestonesAside({ stats }) {
  const homes = topHomes(stats);
  return (
    <div className="card p-5">
      <p className="label">Travel base</p>
      <h3 className="font-display text-lg font-semibold">Where it begins</h3>
      <ul className="mt-4 space-y-3">
        {homes.map((h) => (
          <li key={h.iata} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm">
                {h.city}, <span className="text-ink-muted">{h.country}</span>
              </p>
              <p className="font-mono text-xs text-ink-dim">{h.iata}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums">{h.departures}</p>
              <p className="text-[10px] uppercase tracking-wider text-ink-dim">departures</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function topHomes(stats) {
  const map = new Map();
  stats.flights.forEach((f) => {
    if (!f.from) return;
    const cur = map.get(f.from.iata) || { ...f.from, departures: 0 };
    cur.departures += 1;
    map.set(f.from.iata, cur);
  });
  return [...map.values()].sort((a, b) => b.departures - a.departures).slice(0, 4);
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Still up';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatRelative(ts) {
  if (!ts) return 'just now';
  const diff = Date.now() - ts;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return new Date(ts).toLocaleDateString();
}
