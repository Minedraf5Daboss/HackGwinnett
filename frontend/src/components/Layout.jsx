import { BookOpenText, IdCard, LogOut, Search, UserRound } from 'lucide-react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth.jsx';

const navLinkClass = ({ isActive }) =>
  `inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`;

function NavItem({ to, icon: Icon, children }) {
  return (
    <NavLink to={to} className={navLinkClass}>
      <Icon aria-hidden="true" className="h-4 w-4" />
      {children}
    </NavLink>
  );
}

export default function Layout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/');
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-teal-800">
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-7 w-7" />
            MedAssist
          </Link>
          {!loading && (
            <nav className="flex flex-wrap items-center gap-1">
              <NavItem to="/clinics" icon={Search}>
                Find a clinic
              </NavItem>
              <NavItem to="/simplify" icon={BookOpenText}>
                Plain language
              </NavItem>
              {user ? (
                <>
                  <NavItem to="/passport" icon={IdCard}>
                    My passport
                  </NavItem>
                  <NavItem to="/profile" icon={UserRound}>
                    My profile
                  </NavItem>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    <LogOut aria-hidden="true" className="h-4 w-4" />
                    Log out
                  </button>
                </>
              ) : (
                <>
                  <NavLink to="/login" className={navLinkClass}>
                    Log in
                  </NavLink>
                  <Link
                    to="/register"
                    className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-800"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </nav>
          )}
        </div>
      </header>

      {/* Keyed by page, so each page fades in when you arrive. */}
      <main
        key={location.pathname}
        className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 motion-safe:animate-fade-up"
      >
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
        <p>
          <span className="font-medium text-teal-800">MedAssist</span> · Care that fits the way you
          need it.
        </p>
        <p className="mt-1">
          MedAssist is not a substitute for professional medical advice. In an emergency, call 911.
        </p>
      </footer>
    </div>
  );
}
