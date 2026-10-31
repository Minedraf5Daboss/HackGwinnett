import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../auth.jsx';

const navLinkClass = ({ isActive }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:text-slate-900'
  }`;

export default function Layout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-teal-800">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-7 w-7" />
            MedAssist
          </Link>
          {!loading && (
            <nav className="flex items-center gap-1">
              {user ? (
                <>
                  <span className="hidden px-3 text-sm text-slate-500 sm:inline">{user.email}</span>
                  <NavLink to="/profile" className={navLinkClass}>
                    My profile
                  </NavLink>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900"
                  >
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <NavLink to="/login" className={navLinkClass}>
                    Log in
                  </NavLink>
                  <NavLink to="/register" className={navLinkClass}>
                    Sign up
                  </NavLink>
                </>
              )}
            </nav>
          )}
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 px-4 py-4 text-center text-sm text-slate-500">
        MedAssist is not a substitute for professional medical advice. In an emergency, call 911.
      </footer>
    </div>
  );
}
