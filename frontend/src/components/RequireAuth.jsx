import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../auth.jsx';

/** Wrap a page with this to send logged-out visitors to the login page first. */
export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="text-slate-500">Loading…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}
