import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Trash2,
  AlertTriangle,
  Mail,
  KeyRound,
  Database,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { useSession } from '../state/session.jsx';
import { labelForSource } from '../components/Layout.jsx';

export default function Settings() {
  const navigate = useNavigate();
  const { source, account, flights, scannedAt, clearAll } = useSession();
  const [confirm, setConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const onDelete = () => {
    clearAll();
    setDeleted(true);
    setTimeout(() => navigate('/', { replace: true }), 1200);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="label">Account & privacy</p>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-ink-muted">
          You're in control. SkyHistory only stores what's needed to render your dashboard.
        </p>
      </motion.div>

      {/* Connected account */}
      <Card>
        <Header
          icon={Mail}
          title="Connected source"
          subtitle="Where we read your itineraries from."
        />
        {source ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-bg-soft/50 p-3">
            <div className="min-w-0">
              <p className="truncate font-medium">{account?.email || '—'}</p>
              <p className="text-xs text-ink-muted">
                Connected via {labelForSource(source)}
                {scannedAt
                  ? ` · last scanned ${new Date(scannedAt).toLocaleString()}`
                  : ''}
              </p>
            </div>
            <button
              onClick={() => {
                clearAll();
                navigate('/');
              }}
              className="btn-ghost text-sm"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">
            No source connected.{' '}
            <button
              className="text-brand-300 hover:text-brand-200"
              onClick={() => navigate('/')}
            >
              Connect now →
            </button>
          </p>
        )}
      </Card>

      {/* Privacy */}
      <Card>
        <Header
          icon={ShieldCheck}
          title="What we store"
          subtitle="Minimum data needed to render your dashboard."
        />
        <ul className="mt-3 grid gap-2 text-sm">
          <Bullet>
            Short-lived OAuth access token for Gmail (refreshed silently, revoke any time
            from your Google account).
          </Bullet>
          <Bullet>
            For iCloud: your App-Specific Password is held in memory during a scan and
            never written to disk.
          </Bullet>
          <Bullet>
            Parsed flight metadata (airline, route, date, price) is stored encrypted in
            your private bucket and is wipeable below.
          </Bullet>
          <Bullet negative>
            We never read non-itinerary mail. We never send mail. We never share data
            with third parties.
          </Bullet>
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
          <a
            href="#"
            className="inline-flex items-center gap-1 underline-offset-2 hover:text-ink hover:underline"
          >
            Privacy policy <ExternalLink className="h-3 w-3" />
          </a>
          <span className="text-ink-dim">·</span>
          <a
            href="#"
            className="inline-flex items-center gap-1 underline-offset-2 hover:text-ink hover:underline"
          >
            Security overview <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </Card>

      {/* Storage stats */}
      <Card>
        <Header
          icon={Database}
          title="Local cache"
          subtitle="Browser-side state that powers offline view."
        />
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Flights" value={flights?.length ?? 0} />
          <Stat label="Source" value={source ? labelForSource(source) : '—'} />
          <Stat
            label="Last scan"
            value={scannedAt ? new Date(scannedAt).toLocaleDateString() : '—'}
          />
          <Stat label="Storage" value={`${estimateKb()} KB`} />
        </div>
      </Card>

      {/* Danger zone */}
      <Card danger>
        <Header
          icon={AlertTriangle}
          title="Delete all data"
          subtitle="Wipes flights, tokens, and your dashboard cache. This cannot be undone."
          danger
        />
        {deleted ? (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/5 p-3 text-sm text-emerald-200">
            <CheckCircle2 className="h-4 w-4" />
            All data wiped. Redirecting…
          </div>
        ) : confirm ? (
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-red-400/30 bg-red-400/5 p-3 text-sm text-red-200">
              This will remove your scanned flight history from this browser and revoke
              any cached tokens. Your inbox is not modified.
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onDelete}
                className="btn bg-red-500 text-white hover:bg-red-400 active:bg-red-600"
              >
                <Trash2 className="h-4 w-4" /> Yes, delete everything
              </button>
              <button onClick={() => setConfirm(false)} className="btn-ghost">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirm(true)} className="btn-ghost mt-3 text-sm">
            <Trash2 className="h-4 w-4" /> I want to delete my data
          </button>
        )}
      </Card>
    </div>
  );
}

function Card({ children, danger }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`card p-5 ${danger ? 'border-red-400/20 bg-red-500/[0.03]' : ''}`}
    >
      {children}
    </motion.section>
  );
}

function Header({ icon: Icon, title, subtitle, danger }) {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl border ${
          danger
            ? 'border-red-400/30 bg-red-500/10 text-red-300'
            : 'border-line bg-bg-soft/60 text-brand-300'
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <h2 className="font-display text-base font-semibold">{title}</h2>
        <p className="text-xs text-ink-muted">{subtitle}</p>
      </div>
    </div>
  );
}

function Bullet({ children, negative }) {
  return (
    <li className="flex items-start gap-2">
      <span
        className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
          negative ? 'bg-red-400/70' : 'bg-emerald-400/70'
        }`}
      />
      <span className="text-ink-muted">{children}</span>
    </li>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-line bg-bg-soft/40 p-3">
      <p className="label">{label}</p>
      <p className="mt-1 truncate text-sm font-medium">{value}</p>
    </div>
  );
}

function estimateKb() {
  try {
    const raw = localStorage.getItem('skyhistory:session:v1') || '';
    return Math.max(1, Math.round((raw.length * 2) / 1024));
  } catch {
    return 0;
  }
}
