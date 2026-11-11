import { useState } from 'react';
import { ChartNoAxesCombined, ClipboardList, LayoutDashboard, LogOut } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useSession } from '../context/session.js';
import { Brand } from './ui.jsx';

const links = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/readings', label: 'Readings', icon: ClipboardList },
  { to: '/reports', label: 'Reports', icon: ChartNoAxesCombined },
];

export default function Layout() {
  const { user, logout } = useSession();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function signOut() {
    setPending(true);
    setError('');
    try {
      await logout();
    } catch (error) {
      setError(error.message);
      setPending(false);
    }
  }

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="sidebar">
      <Brand />
      <nav aria-label="Main navigation">
        {links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === '/'}>
          <Icon size={19} aria-hidden="true" />{label}
        </NavLink>)}
      </nav>
      <div className="account">
        <span className="avatar" aria-hidden="true">{Array.from(user.name)[0]?.toUpperCase()}</span>
        <span className="account-name" title={user.name}>{user.name}</span>
        <button className="icon-button" type="button" onClick={signOut} disabled={pending} aria-label="Log out" title="Log out">
          <LogOut size={19} aria-hidden="true" />
        </button>
        {error && <p className="error-text" role="alert">{error}</p>}
      </div>
    </aside>
    <main id="main-content" className="content"><Outlet /></main>
  </div>;
}
