import { Routes, Route, Navigate } from 'react-router-dom';
import { SessionProvider, useSession } from './state/session.jsx';
import Layout from './components/Layout.jsx';
import ConnectPanel from './pages/ConnectPanel.jsx';
import ScannerProgress from './pages/ScannerProgress.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Tickets from './pages/Tickets.jsx';
import Settings from './pages/Settings.jsx';

function RequireSession({ children }) {
  const { source, flights } = useSession();
  if (!source) return <Navigate to="/" replace />;
  if (!flights) return <Navigate to="/scan" replace />;
  return children;
}

function RequireScanning({ children }) {
  const { source } = useSession();
  if (!source) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <SessionProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<ConnectPanel />} />
          <Route
            path="/scan"
            element={
              <RequireScanning>
                <ScannerProgress />
              </RequireScanning>
            }
          />
          <Route
            path="/dashboard"
            element={
              <RequireSession>
                <Dashboard />
              </RequireSession>
            }
          />
          <Route
            path="/tickets"
            element={
              <RequireSession>
                <Tickets />
              </RequireSession>
            }
          />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </SessionProvider>
  );
}
