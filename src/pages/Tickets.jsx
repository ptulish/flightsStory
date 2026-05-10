import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Ticket as TicketIcon, Download } from 'lucide-react';
import { useSession } from '../state/session.jsx';
import { computeStats } from '../utils/stats';
import TicketList from '../components/TicketList.jsx';
import { formatNumber, formatKm, formatCurrency } from '../utils/format';

export default function Tickets() {
  const { flights } = useSession();
  const stats = useMemo(() => computeStats(flights), [flights]);

  const exportCsv = () => {
    const rows = [
      ['date', 'airline', 'flight_no', 'from', 'to', 'distance_km', 'duration_min', 'price', 'currency', 'cabin'],
      ...stats.flights.map((f) => [
        f.departure_date,
        f.airline_info.name,
        f.flight_number,
        `${f.from?.city || f.from_iata} (${f.from_iata})`,
        `${f.to?.city || f.to_iata} (${f.to_iata})`,
        Math.round(f.distance_km),
        f.duration_min ?? '',
        f.price,
        f.currency,
        f.cabin || 'economy',
      ]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skyhistory-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <div>
          <p className="label">Library</p>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">All your tickets</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {formatNumber(stats.totals.flights)} flights · {formatKm(stats.totals.distance_km)} ·{' '}
            {formatCurrency(stats.totals.spend_usd, 'USD', { compact: true })} total
          </p>
        </div>
        <button onClick={exportCsv} className="btn-soft text-sm">
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </motion.div>

      {stats.flights.length === 0 ? (
        <div className="card grid place-items-center px-6 py-20 text-center">
          <TicketIcon className="mb-3 h-10 w-10 text-ink-dim" />
          <p className="text-sm text-ink-muted">No tickets parsed yet.</p>
        </div>
      ) : (
        <TicketList flights={stats.flights} initialPageSize={20} />
      )}
    </div>
  );
}
