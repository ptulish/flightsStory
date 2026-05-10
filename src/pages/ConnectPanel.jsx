import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import {
  Mail,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  EyeOff,
  KeyRound,
  Apple,
  Lock,
  Plane,
} from 'lucide-react';
import { useSession } from '../state/session.jsx';
import { motion } from 'framer-motion';
import { startIcloudSession } from '../api/flights';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Read-only access',
    body: 'We request the bare minimum scope needed to find your tickets. No drafts, no sending, no deletion.',
  },
  {
    icon: EyeOff,
    title: 'Passwords never stored',
    body: 'Google uses OAuth tokens. iCloud uses one-time App Passwords held only in memory during a scan.',
  },
  {
    icon: Zap,
    title: 'AI does the boring part',
    body: 'Gemini parses each itinerary into structured flight data — airports, dates, prices, airline.',
  },
];

export default function ConnectPanel() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { startSession } = useSession();
  const [tab, setTab] = useState('gmail');
  const [imap, setImap] = useState({ email: '', appPassword: '', server: 'imap.mail.me.com' });
  const [oauthError, setOauthError] = useState('');
  const [imapError, setImapError] = useState('');
  const [imapConnecting, setImapConnecting] = useState(false);

  useEffect(() => {
    const oauth = searchParams.get('oauth');
    if (!oauth) return;

    if (oauth === 'ok' && searchParams.get('source') === 'gmail') {
      const email = searchParams.get('email') || 'you@gmail.com';
      const name = searchParams.get('name') || email.split('@')[0] || 'You';
      const scanToken = searchParams.get('scanToken') || '';
      startSession('gmail', { email, name, scanToken });
      navigate('/scan', { replace: true });
      return;
    }

    if (oauth === 'error') {
      setTab('gmail');
      setOauthError('Google sign-in failed. Please try again.');
    }
  }, [navigate, searchParams, startSession]);

  const handleGmail = () => {
    const next = `${window.location.origin}/`;
    const authUrl = `${API_BASE}/api/auth/google?next=${encodeURIComponent(next)}`;
    window.location.assign(authUrl);
  };

  const handleImap = async (e) => {
    e.preventDefault();
    if (!imap.email || !imap.appPassword) return;
    try {
      setImapConnecting(true);
      setImapError('');
      const data = await startIcloudSession({
        email: imap.email,
        appPassword: imap.appPassword,
        server: imap.server,
      });
      startSession('icloud', data.account);
      navigate('/scan');
    } catch (error) {
      setImapError(error.message || 'Failed to connect to iCloud');
    } finally {
      setImapConnecting(false);
    }
  };

  const handleDemo = () => {
    startSession('demo', { email: 'demo@skyhistory.app', name: 'Alex Sky' });
    navigate('/scan');
  };

  return (
    <div className="mx-auto max-w-7xl">
      <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_1fr]">
        {/* Left: pitch */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden"
        >
          <div className="chip mb-5">
            <Sparkles className="h-3 w-3 text-accent-cyan" /> Now in private beta
          </div>
          <h1 className="font-display text-balance text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
            Every flight you've ever taken,{' '}
            <span className="text-gradient">stitched into one map.</span>
          </h1>
          <p className="mt-5 max-w-xl text-balance text-lg text-ink-muted">
            SkyHistory reads the boarding-pass emails buried in your inbox and turns
            five years of travel into a beautiful, scrollable story — countries,
            airlines, distance flown, money spent.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="card p-4">
                <Icon className="h-5 w-5 text-brand-300" />
                <p className="mt-3 text-sm font-semibold">{title}</p>
                <p className="mt-1 text-xs text-ink-muted">{body}</p>
              </div>
            ))}
          </div>

          {/* Decorative arc */}
          <DecorativeArc />
        </motion.section>

        {/* Right: connect card */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="card-elevated relative w-full overflow-hidden p-6 sm:p-7"
        >
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-brand-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-12 h-48 w-48 rounded-full bg-accent-violet/15 blur-3xl" />

          <h2 className="font-display text-xl font-semibold">Connect your inbox</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Pick a source to scan. Or peek inside with the demo first.
          </p>

          <div className="mt-5 grid grid-cols-3 gap-1.5 rounded-xl border border-line bg-bg-soft/60 p-1">
            <TabButton active={tab === 'gmail'} onClick={() => setTab('gmail')}>
              <Mail className="h-3.5 w-3.5" /> Gmail
            </TabButton>
            <TabButton active={tab === 'icloud'} onClick={() => setTab('icloud')}>
              <Apple className="h-3.5 w-3.5" /> iCloud
            </TabButton>
            <TabButton active={tab === 'demo'} onClick={() => setTab('demo')}>
              <Sparkles className="h-3.5 w-3.5" /> Demo
            </TabButton>
          </div>

          <div className="mt-5">
            {tab === 'gmail' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-line bg-bg-soft/40 p-4">
                  <p className="label">Permissions requested</p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent-emerald"></span>
                      <span className="font-mono text-xs text-ink-muted">gmail.readonly</span>
                      <span className="text-ink-muted">— read messages, never send</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent-emerald"></span>
                      <span className="font-mono text-xs text-ink-muted">openid email profile</span>
                      <span className="text-ink-muted">— so we know it's you</span>
                    </li>
                  </ul>
                </div>
                <button onClick={handleGmail} className="btn-primary w-full">
                  <GoogleMark /> Continue with Google
                  <ArrowRight className="h-4 w-4" />
                </button>
                {oauthError && (
                  <p className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                    {oauthError}
                  </p>
                )}
                <p className="text-center text-xs text-ink-dim">
                  By continuing you agree to our terms. Disconnect anytime in Settings.
                </p>
              </div>
            )}

            {tab === 'icloud' && (
              <form onSubmit={handleImap} className="space-y-4">
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-200/90">
                  <p>
                    Apple requires an{' '}
                    <a
                      href="https://support.apple.com/en-us/HT204397"
                      target="_blank"
                      rel="noreferrer"
                      className="underline underline-offset-2 hover:text-amber-100"
                    >
                      App-Specific Password
                    </a>
                    . It's safe to share with us — it can be revoked instantly and never
                    leaves your scan session.
                  </p>
                </div>
                <Field label="iCloud email">
                  <Mail className="h-4 w-4 text-ink-muted" />
                  <input
                    type="email"
                    placeholder="you@icloud.com"
                    className="input pl-9"
                    value={imap.email}
                    onChange={(e) => setImap((s) => ({ ...s, email: e.target.value }))}
                    required
                  />
                </Field>
                <Field label="App-Specific Password">
                  <KeyRound className="h-4 w-4 text-ink-muted" />
                  <input
                    type="password"
                    placeholder="xxxx-xxxx-xxxx-xxxx"
                    className="input pl-9 font-mono tracking-widest"
                    value={imap.appPassword}
                    onChange={(e) => setImap((s) => ({ ...s, appPassword: e.target.value }))}
                    required
                  />
                </Field>
                <details className="rounded-xl border border-line bg-bg-soft/40 px-3 py-2 text-xs">
                  <summary className="cursor-pointer text-ink-muted hover:text-ink">
                    Custom IMAP host
                  </summary>
                  <Field label="IMAP server" className="mt-3">
                    <input
                      type="text"
                      className="input"
                      value={imap.server}
                      onChange={(e) => setImap((s) => ({ ...s, server: e.target.value }))}
                    />
                  </Field>
                </details>
                <button type="submit" className="btn-primary w-full" disabled={imapConnecting}>
                  <Lock className="h-4 w-4" /> {imapConnecting ? 'Connecting...' : 'Connect securely'}
                  <ArrowRight className="h-4 w-4" />
                </button>
                {imapError && (
                  <p className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
                    {imapError}
                  </p>
                )}
              </form>
            )}

            {tab === 'demo' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-line bg-gradient-to-br from-bg-soft to-bg-card p-4">
                  <p className="label">Demo includes</p>
                  <ul className="mt-2 grid grid-cols-2 gap-y-1.5 text-sm">
                    <li className="text-ink-muted">79 flights</li>
                    <li className="text-ink-muted">5 years</li>
                    <li className="text-ink-muted">26 countries</li>
                    <li className="text-ink-muted">14 airlines</li>
                  </ul>
                </div>
                <button onClick={handleDemo} className="btn-primary w-full">
                  <Plane className="h-4 w-4 -rotate-12" /> Explore demo dashboard
                  <ArrowRight className="h-4 w-4" />
                </button>
                <p className="text-center text-xs text-ink-dim">
                  Demo data lives only in your browser. Nothing leaves this session.
                </p>
              </div>
            )}
          </div>
        </motion.section>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
        active
          ? 'bg-bg-elevated text-ink shadow-card ring-1 ring-line'
          : 'text-ink-muted hover:text-ink'
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      <div className="relative mt-1.5">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
          {Array.isArray(children) ? children[0] : null}
        </span>
        {Array.isArray(children) ? children[1] : children}
      </div>
    </label>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="h-4 w-4">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.5-5.9 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8 20-20 0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.4 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.4 0-9.7-3.5-11.3-8L6.2 32.8C9.5 39.4 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C40.1 36.2 44 31 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}

function DecorativeArc() {
  return (
    <div className="pointer-events-none mt-10 h-40 w-full select-none [mask-image:linear-gradient(to_bottom,black,transparent)]">
      <svg viewBox="0 0 800 200" className="h-full w-full">
        <defs>
          <linearGradient id="arcg" x1="0" x2="1">
            <stop offset="0" stopColor="#5e85ff" stopOpacity="0" />
            <stop offset="0.5" stopColor="#a78bfa" />
            <stop offset="1" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="160" r="3" fill="#22d3ee" />
        <circle cx="700" cy="160" r="3" fill="#a78bfa" />
        <path
          d="M100 160 Q 400 0 700 160"
          stroke="url(#arcg)"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="4 6"
        />
        <circle cx="400" cy="80" r="2.5" fill="#fff" opacity=".5" />
      </svg>
    </div>
  );
}
