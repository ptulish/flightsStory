import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { formatNumber, formatCurrency, formatKm } from '../../utils/format';

const COLORS = ['#5e85ff', '#7b95ff', '#a78bfa', '#c4b5fd', '#22d3ee', '#67e8f9'];

export default function YearActivityChart({ data }) {
  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="label">Activity by year</p>
          <h3 className="font-display text-lg font-semibold">Travel intensity</h3>
        </div>
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-ink-dim">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-sm bg-brand-400" /> flights
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 bg-accent-cyan" /> distance
          </span>
        </div>
      </div>

      <div className="mt-3 h-56 w-full">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis
              dataKey="year"
              stroke="#8a93ad"
              tickLine={false}
              axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
              tick={{ fontSize: 11 }}
            />
            <YAxis
              yAxisId="left"
              stroke="#8a93ad"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              width={32}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#8a93ad"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              width={32}
            />
            <Tooltip content={<TooltipContent />} cursor={{ fill: 'rgba(94,133,255,0.05)' }} />
            <Bar
              yAxisId="left"
              dataKey="flights"
              radius={[6, 6, 0, 0]}
              maxBarSize={32}
              animationDuration={700}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="distance_km"
              stroke="#22d3ee"
              strokeWidth={2}
              dot={{ r: 3, fill: '#22d3ee', stroke: '#0a0e1a', strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              animationDuration={700}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TooltipContent({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-line bg-bg-card/95 p-3 text-xs shadow-card backdrop-blur">
      <p className="font-display text-sm font-semibold">{label}</p>
      <p className="mt-1 text-ink-muted">{formatNumber(d.flights)} flights</p>
      <p className="text-ink-muted">{formatKm(d.distance_km)}</p>
      <p className="text-ink-muted">{formatCurrency(d.spend_usd, 'USD', { compact: true })} spent</p>
    </div>
  );
}
