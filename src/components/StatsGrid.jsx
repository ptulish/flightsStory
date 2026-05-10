import { motion } from 'framer-motion';
import {
  Plane,
  Globe2,
  Wallet,
  Building2,
  Clock,
  Route as RouteIcon,
} from 'lucide-react';
import { formatCurrency, formatKm, formatNumber, formatDuration } from '../utils/format';
import { useAnimatedNumber } from '../utils/useAnimatedNumber';

export default function StatsGrid({ stats }) {
  const { totals, airlines } = stats;
  const topAirline = airlines[0];

  const cards = [
    {
      key: 'flights',
      label: 'Flights',
      value: totals.flights,
      sub: `${totals.cities} unique cities`,
      icon: Plane,
      tint: 'from-brand-500/30 to-brand-500/5 text-brand-200',
      ring: 'ring-brand-400/30',
      format: (v) => formatNumber(Math.round(v)),
    },
    {
      key: 'distance',
      label: 'Distance flown',
      value: totals.distance_km,
      sub: `${(totals.distance_km / 40075).toFixed(2)}× around Earth`,
      icon: RouteIcon,
      tint: 'from-accent-cyan/30 to-accent-cyan/5 text-cyan-200',
      ring: 'ring-cyan-400/30',
      format: (v) => formatKm(v),
    },
    {
      key: 'countries',
      label: 'Countries visited',
      value: totals.countries,
      sub: `${totals.airlines} airlines flown`,
      icon: Globe2,
      tint: 'from-accent-violet/30 to-accent-violet/5 text-violet-200',
      ring: 'ring-violet-400/30',
      format: (v) => formatNumber(Math.round(v)),
    },
    {
      key: 'spend',
      label: 'Total spend',
      value: totals.spend_usd,
      sub: `≈ ${formatCurrency(totals.spend_usd / Math.max(1, totals.flights), 'USD')} per flight`,
      icon: Wallet,
      tint: 'from-accent-emerald/30 to-accent-emerald/5 text-emerald-200',
      ring: 'ring-emerald-400/30',
      format: (v) => formatCurrency(v, 'USD', { compact: true }),
    },
    {
      key: 'airtime',
      label: 'Time in the air',
      value: totals.airtime_min,
      sub: `${(totals.airtime_min / 60 / 24).toFixed(1)} days aloft`,
      icon: Clock,
      tint: 'from-accent-amber/30 to-accent-amber/5 text-amber-200',
      ring: 'ring-amber-400/30',
      format: (v) => formatDuration(Math.round(v)),
    },
    {
      key: 'top-airline',
      label: 'Favorite airline',
      value: topAirline?.count ?? 0,
      sub: topAirline ? topAirline.name : '—',
      icon: Building2,
      tint: 'from-pink-500/30 to-pink-500/5 text-pink-200',
      ring: 'ring-pink-400/30',
      format: (v) => `${formatNumber(Math.round(v))} flights`,
      pillColor: topAirline?.color,
      pillCode: topAirline?.code,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
      {cards.map((c, i) => (
        <StatCard key={c.key} index={i} {...c} />
      ))}
    </div>
  );
}

function StatCard({ index, label, value, sub, icon: Icon, tint, ring, format, pillCode, pillColor }) {
  const display = useAnimatedNumber(value, { duration: 1100 });
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.04 * index }}
      className={`stat-card group ring-1 ${ring}`}
    >
      <div
        className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${tint} opacity-60 transition group-hover:opacity-90`}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <p className="label">{label}</p>
          {pillCode ? (
            <span
              className="grid h-7 w-7 place-items-center rounded-lg text-[10px] font-semibold text-white"
              style={{ backgroundColor: pillColor }}
            >
              {pillCode}
            </span>
          ) : (
            <Icon className="h-4 w-4 text-ink-muted" />
          )}
        </div>
        <p className="mt-3 font-display text-2xl font-semibold tabular-nums sm:text-3xl">
          {format(display)}
        </p>
        <p className="mt-1 truncate text-xs text-ink-muted">{sub}</p>
      </div>
    </motion.div>
  );
}
