import { Navigate, Route, Routes } from 'react-router-dom';
import { useSession } from './context/session.js';
import Layout from './components/Layout.jsx';
import Auth from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Readings from './pages/Readings.jsx';
import Reports from './pages/Reports.jsx';

export default function App() {
  const { user } = useSession();
  return (
    <Routes>
      <Route
        path="/login"
        element={
          user ? <Navigate to="/" replace /> : <Auth key="login" mode="login" />
        }
      />
      <Route
        path="/register"
        element={
          user ? (
            <Navigate to="/" replace />
          ) : (
            <Auth key="register" mode="register" />
          )
        }
      />
      <Route element={user ? <Layout /> : <Navigate to="/login" replace />}>
        <Route index element={<Dashboard />} />
        <Route path="/readings" element={<Readings />} />
        <Route path="/reports" element={<Reports />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
