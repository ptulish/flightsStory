import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Plane,
  LayoutDashboard,
  Ticket,
  Settings,
  LogOut,
  Github,
  ShieldCheck,
} from 'lucide-react';
import { useSession } from '../state/session.jsx';
import { useState } from 'react';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, requiresSession: true },
  { to: '/tickets', label: 'Tickets', icon: Ticket, requiresSession: true },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export default function Layout() {
  const { source, account, flights, clearAll } = useSession();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const onLogout = () => {
    clearAll();
    navigate('/', { replace: true });
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-line bg-bg-soft/80 backdrop-blur-md
          transition-transform md:static md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex h-full flex-col p-5">
          <Brand onClick={() => setOpen(false)} />

          <nav className="mt-8 space-y-1">
            {NAV.map(({ to, label, icon: Icon, requiresSession }) => {
              const disabled = requiresSession && (!source || !flights);
              return (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    [
                      'nav-link',
                      isActive ? 'active' : '',
                      disabled ? 'pointer-events-none opacity-40' : '',
                    ].join(' ')
                  }
                  end
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-auto space-y-3">
            <div className="card p-3">
              <p className="label">Privacy</p>
              <div className="mt-2 flex items-start gap-2 text-xs text-ink-muted">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent-emerald" />
                <p>
                  We never store your password. Only short-lived tokens are kept,
                  and you can wipe everything in one click.
                </p>
              </div>
            </div>

            {account ? (
              <div className="flex items-center justify-between gap-2 rounded-xl border border-line bg-bg-card/60 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{account.name || account.email}</p>
                  <p className="truncate text-xs text-ink-muted">{labelForSource(source)}</p>
                </div>
                <button
                  onClick={onLogout}
                  className="rounded-lg p-2 text-ink-muted hover:bg-white/5 hover:text-ink"
                  title="Disconnect"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl border border-line bg-bg-card/60 px-3 py-2.5 text-xs text-ink-muted hover:text-ink"
              >
                <Github className="h-4 w-4" />
                Open source — see how it works
              </a>
            )}
          </div>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex min-h-screen flex-1 flex-col md:ml-0">
        <Header onMenu={() => setOpen((s) => !s)} />
        <main className="flex-1 px-4 pb-12 pt-6 sm:px-6 lg:px-10">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}

function Brand({ onClick }) {
  return (
    <NavLink to="/" onClick={onClick} className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-violet shadow-glow">
        <Plane className="h-5 w-5 -rotate-12 text-white" />
      </div>
      <div>
        <p className="font-display text-lg font-semibold leading-tight">SkyHistory</p>
        <p className="text-xs text-ink-muted">Your flights, mapped.</p>
      </div>
    </NavLink>
  );
}

function Header({ onMenu }) {
  const { account, source } = useSession();
  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-bg/80 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-10">
      <button
        onClick={onMenu}
        className="rounded-lg border border-line p-2 text-ink-muted md:hidden"
        aria-label="Menu"
      >
        <span className="block h-0.5 w-5 bg-current"></span>
        <span className="mt-1 block h-0.5 w-5 bg-current"></span>
        <span className="mt-1 block h-0.5 w-5 bg-current"></span>
      </button>
      <div className="hidden md:block">
        <p className="text-sm text-ink-muted">
          {source ? `Signed in via ${labelForSource(source)}` : 'Welcome to SkyHistory'}
        </p>
      </div>
      <div className="ml-auto flex items-center gap-3">
        {account?.email && (
          <span className="hidden rounded-full border border-line bg-white/5 px-3 py-1 text-xs text-ink-muted md:inline-flex">
            {account.email}
          </span>
        )}
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line/60 px-4 py-5 text-xs text-ink-dim sm:px-6 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p>© {new Date().getFullYear()} SkyHistory. Read-only access. We never sell your data.</p>
        <p className="font-mono">v0.1.0 · MVP preview</p>
      </div>
    </footer>
  );
}

export function labelForSource(source) {
  switch (source) {
    case 'gmail':
      return 'Gmail';
    case 'icloud':
      return 'iCloud Mail';
    case 'demo':
      return 'Demo mode';
    default:
      return source || '';
  }
}
