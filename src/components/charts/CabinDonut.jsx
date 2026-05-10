import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const CABIN_COLORS = {
  economy: '#5e85ff',
  business: '#a78bfa',
  first: '#22d3ee',
  premium: '#f472b6',
};

const CABIN_LABELS = {
  economy: 'Economy',
  business: 'Business',
  first: 'First',
  premium: 'Premium economy',
};

export default function CabinDonut({ data }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  const sorted = [...data].sort((a, b) => b.count - a.count);

  return (
    <div className="card p-5">
      <p className="label">Cabin mix</p>
      <h3 className="font-display text-lg font-semibold">How you flew</h3>

      <div className="mt-3 grid grid-cols-[1fr,1fr] items-center gap-2">
        <div className="relative h-40">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={sorted}
                dataKey="count"
                innerRadius={42}
                outerRadius={64}
                paddingAngle={2}
                stroke="none"
                animationDuration={700}
              >
                {sorted.map((d) => (
                  <Cell key={d.cabin} fill={CABIN_COLORS[d.cabin] || '#5e85ff'} />
                ))}
              </Pie>
              <Tooltip content={<TooltipContent total={total} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="text-center">
              <p className="font-display text-2xl font-semibold tabular-nums">{total}</p>
              <p className="text-[10px] uppercase tracking-wider text-ink-dim">flights</p>
            </div>
          </div>
        </div>

        <ul className="space-y-2">
          {sorted.map((d) => {
            const pct = ((d.count / total) * 100).toFixed(0);
            return (
              <li key={d.cabin} className="flex items-center gap-2 text-sm">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: CABIN_COLORS[d.cabin] || '#5e85ff' }}
                />
                <span className="flex-1 truncate">
                  {CABIN_LABELS[d.cabin] || d.cabin}
                </span>
                <span className="tabular-nums text-ink-muted">{pct}%</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function TooltipContent({ active, payload, total }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  const pct = ((d.count / total) * 100).toFixed(0);
  return (
    <div className="rounded-xl border border-line bg-bg-card/95 p-2.5 text-xs shadow-card backdrop-blur">
      <p className="font-medium">{CABIN_LABELS[d.cabin] || d.cabin}</p>
      <p className="text-ink-muted">{d.count} flights · {pct}%</p>
    </div>
  );
}
