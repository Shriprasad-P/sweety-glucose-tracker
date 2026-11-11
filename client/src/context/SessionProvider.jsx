import { useEffect, useState } from 'react';
import { SessionContext } from './session.js';
import { api } from '../services/api.js';
import { StatePanel } from '../components/ui.jsx';

export default function SessionProvider({ children }) {
  const [user, setUser] = useState(null);
  const [config, setConfig] = useState(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const abort = new AbortController();
    const expire = () => setUser(null);
    window.addEventListener('sweety:session-expired', expire);
    Promise.all([
      api('/config', { signal: abort.signal }),
      api('/auth/me', { signal: abort.signal }).catch((error) => {
        if (error.status === 401) return null;
        throw error;
      }),
    ])
      .then(([config, account]) => {
        if (abort.signal.aborted) return;
        setUser(account);
        setConfig(config);
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setError(
            'Sweety could not connect. Check that the server is running.',
          );
      });
    return () => {
      abort.abort();
      window.removeEventListener('sweety:session-expired', expire);
    };
  }, [attempt]);

  async function authenticate(mode, body) {
    setUser(await api(`/auth/${mode}`, { method: 'POST', body }));
  }

  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    setUser(null);
  }

  if (!config) {
    return (
      <main className="center-screen">
        <StatePanel
          loading={!error}
          error={error}
          retry={() => {
            setError('');
            setAttempt((value) => value + 1);
          }}
        />
      </main>
    );
  }

  return (
    <SessionContext.Provider
      value={{ user, timeZone: config.timeZone, authenticate, logout }}
    >
      {children}
    </SessionContext.Provider>
  );
}
