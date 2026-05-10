import { motion } from 'framer-motion';
import { formatNumber, formatKm } from '../../utils/format';

export default function TopAirlines({ airlines, limit = 6 }) {
  const top = airlines.slice(0, limit);
  const max = top[0]?.count || 1;

  return (
    <div className="card p-5">
      <p className="label">Most flown</p>
      <h3 className="font-display text-lg font-semibold">Top airlines</h3>

      <ul className="mt-4 space-y-3">
        {top.map((a, i) => {
          const pct = (a.count / max) * 100;
          return (
            <li key={a.code}>
              <div className="flex items-center justify-between text-sm">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-semibold text-white"
                    style={{ backgroundColor: a.color }}
                  >
                    {a.code}
                  </span>
                  <span className="truncate font-medium">{a.name}</span>
                </div>
                <span className="ml-2 shrink-0 tabular-nums text-ink-muted">
                  {formatNumber(a.count)}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ backgroundColor: a.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, delay: i * 0.05, ease: [0.2, 0.7, 0.2, 1] }}
                  />
                </div>
                <span className="w-20 text-right text-[11px] text-ink-dim tabular-nums">
                  {formatKm(a.distance_km)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
