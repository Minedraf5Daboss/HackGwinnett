// Keeps track of who is logged in. Use it in any component with `const { user } = useAuth()`.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getToken, setToken, setUnauthorizedHandler } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(() => Boolean(getToken()));

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => setUnauthorizedHandler(logout), [logout]);

  // Restore the session from a token saved on an earlier visit.
  useEffect(() => {
    if (!getToken()) return;
    api('/users/me')
      .then(setUser)
      .catch(logout)
      .finally(() => setLoading(false));
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const { access_token } = await api('/auth/token', {
      method: 'POST',
      form: { username: email, password },
    });
    setToken(access_token);
    setUser(await api('/users/me'));
  }, []);

  const register = useCallback(
    async (email, password) => {
      await api('/auth/register', { method: 'POST', body: { email, password } });
      await login(email, password);
    },
    [login],
  );

  const value = useMemo(
    () => ({ user, loading, login, logout, register }),
    [user, loading, login, logout, register],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
