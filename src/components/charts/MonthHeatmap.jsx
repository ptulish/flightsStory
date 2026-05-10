import { motion } from 'framer-motion';
import { MONTH_NAMES } from '../../utils/stats';

export default function MonthHeatmap({ data }) {
  const max = Math.max(1, ...data.map((d) => d.flights));
  const bestMonth = data.reduce((a, b) => (a.flights > b.flights ? a : b), data[0]);

  return (
    <div className="card p-5">
      <p className="label">Seasonality</p>
      <h3 className="font-display text-lg font-semibold">When you fly</h3>

      <div className="mt-4 grid grid-cols-12 items-end gap-1.5">
        {data.map((d, i) => {
          const t = d.flights / max;
          const isPeak = d.month === bestMonth.month && d.flights > 0;
          return (
            <div key={d.month} className="flex flex-col items-center gap-1">
              <div className="relative flex h-24 w-full items-end">
                <motion.div
                  className={`w-full rounded-md ${
                    isPeak
                      ? 'bg-gradient-to-t from-accent-cyan/80 to-brand-400/80'
                      : 'bg-gradient-to-t from-brand-500/40 to-brand-300/30'
                  }`}
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(8, t * 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.05 * i, ease: [0.2, 0.7, 0.2, 1] }}
                  title={`${MONTH_NAMES[d.month]}: ${d.flights}`}
                />
              </div>
              <span className={`text-[10px] ${isPeak ? 'text-accent-cyan' : 'text-ink-dim'}`}>
                {MONTH_NAMES[d.month]}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-ink-muted">
        You fly the most in{' '}
        <span className="font-medium text-ink">{MONTH_NAMES[bestMonth.month]}</span> ·{' '}
        {bestMonth.flights} trips total over the period.
      </p>
    </div>
  );
}
