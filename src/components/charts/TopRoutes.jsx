import { motion } from 'framer-motion';
import { ArrowLeftRight } from 'lucide-react';
import { formatKm } from '../../utils/format';

export default function TopRoutes({ routes, limit = 6 }) {
  const top = routes.slice(0, limit);
  const max = top[0]?.count || 1;

  return (
    <div className="card p-5">
      <p className="label">Most repeated</p>
      <h3 className="font-display text-lg font-semibold">Favorite routes</h3>

      <ul className="mt-4 space-y-3">
        {top.map((r, i) => {
          const pct = (r.count / max) * 100;
          return (
            <li key={r.key} className="flex items-center gap-3">
              <div className="flex w-32 shrink-0 items-center gap-1.5 font-mono text-xs">
                <span className="rounded-md bg-white/5 px-1.5 py-0.5">{r.a.iata}</span>
                <ArrowLeftRight className="h-3 w-3 text-ink-dim" />
                <span className="rounded-md bg-white/5 px-1.5 py-0.5">{r.b.iata}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">
                  {r.a.city} <span className="text-ink-dim">↔</span> {r.b.city}
                </p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-brand-400 to-accent-cyan"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: i * 0.05 }}
                  />
                </div>
              </div>
              <div className="w-16 shrink-0 text-right">
                <p className="text-sm font-semibold tabular-nums">{r.count}×</p>
                <p className="text-[10px] uppercase tracking-wider text-ink-dim">
                  {formatKm(r.distance_km)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
