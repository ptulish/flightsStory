import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const SessionContext = createContext(null);

const STORAGE_KEY = 'skyhistory:session:v1';

const initial = {
  source: null, // 'gmail' | 'icloud' | 'demo'
  account: null, // { email, name }
  flights: null, // array | null (null = not yet scanned)
  scannedAt: null,
};

export function SessionProvider({ children }) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return initial;
      const parsed = JSON.parse(raw);
      return { ...initial, ...parsed };
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state]);

  const startSession = useCallback((source, account) => {
    setState((s) => ({ ...s, source, account, flights: null, scannedAt: null }));
  }, []);

  const setFlights = useCallback((flights) => {
    setState((s) => ({ ...s, flights, scannedAt: Date.now() }));
  }, []);

  const clearAll = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setState(initial);
  }, []);

  const value = useMemo(
    () => ({ ...state, startSession, setFlights, clearAll }),
    [state, startSession, setFlights, clearAll],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
