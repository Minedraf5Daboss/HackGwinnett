import { BookOpenText, IdCard, LogOut, Menu, Search, UserRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth.jsx';
import { buttonClass } from './ui.jsx';

const PUBLIC_LINKS = [
  { to: '/clinics', icon: Search, label: 'Find a clinic' },
  { to: '/simplify', icon: BookOpenText, label: 'Plain language' },
];
const ACCOUNT_LINKS = [
  { to: '/passport', icon: IdCard, label: 'My passport' },
  { to: '/profile', icon: UserRound, label: 'My profile' },
];

const pillClass = ({ isActive }) =>
  `inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
    isActive ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'
  }`;

const menuLinkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 font-medium ${
    isActive ? 'bg-teal-50 text-teal-800' : 'text-slate-700 hover:bg-slate-100'
  }`;

export default function Layout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  function handleLogout() {
    logout();
    navigate('/');
  }

  const links = user ? [...PUBLIC_LINKS, ...ACCOUNT_LINKS] : PUBLIC_LINKS;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/75 backdrop-blur-lg">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Link
            to="/"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-900"
          >
            <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="h-8 w-8" />
            MedAssist
          </Link>

          {!loading && (
            <>
              <nav
                aria-label="Main"
                className="hidden items-center gap-1 rounded-full bg-slate-100/80 p-1 ring-1 ring-slate-900/5 md:flex"
              >
                {links.map(({ to, icon: Icon, label }) => (
                  <NavLink key={to} to={to} className={pillClass}>
                    <Icon aria-hidden="true" className="h-4 w-4" />
                    {label}
                  </NavLink>
                ))}
              </nav>

              <div className="hidden items-center gap-2 md:flex">
                {user ? (
                  <>
                    <span
                      title={user.email}
                      aria-hidden="true"
                      className="grid h-8 w-8 place-items-center rounded-full bg-linear-to-br from-teal-500 to-emerald-600 text-sm font-semibold text-white"
                    >
                      {user.email[0].toUpperCase()}
                    </span>
                    <button type="button" onClick={handleLogout} className={buttonClass('ghost')}>
                      <LogOut aria-hidden="true" />
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className={buttonClass('ghost')}>
                      Log in
                    </Link>
                    <Link to="/register" className={buttonClass('primary')}>
                      Sign up
                    </Link>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-expanded={menuOpen}
                aria-controls="mobile-menu"
                className={`${buttonClass('ghost')} md:hidden`}
              >
                {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
                Menu
              </button>
            </>
          )}
        </div>

        {menuOpen && (
          <nav
            id="mobile-menu"
            aria-label="Main"
            className="border-t border-slate-200/70 bg-white px-4 py-3 md:hidden"
          >
            <ul className="space-y-1">
              {links.map(({ to, icon: Icon, label }) => (
                <li key={to}>
                  <NavLink to={to} className={menuLinkClass}>
                    <Icon aria-hidden="true" className="h-5 w-5 text-teal-700" />
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2 border-t border-slate-100 pt-3">
              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`${buttonClass('secondary')} flex-1`}
                >
                  <LogOut aria-hidden="true" />
                  Log out
                </button>
              ) : (
                <>
                  <Link to="/login" className={`${buttonClass('secondary')} flex-1`}>
                    Log in
                  </Link>
                  <Link to="/register" className={`${buttonClass('primary')} flex-1`}>
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </header>

      {/* Keyed by page, so each page fades in when you arrive. */}
      <main
        key={location.pathname}
        className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 motion-safe:animate-fade-up sm:py-10"
      >
        <Outlet />
      </main>

      <footer className="border-t border-slate-200/70 bg-white/60">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-semibold text-slate-700">MedAssist</span> · Care that fits the way
            you need it.
          </p>
          <p>Not a substitute for professional medical advice. In an emergency, call 911.</p>
        </div>
      </footer>
    </div>
  );
}
