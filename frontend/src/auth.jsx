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

  const startSession = useCallback(async (accessToken) => {
    setToken(accessToken);
    setUser(await api('/users/me'));
  }, []);

  /** Log in. If the account has two-step verification on, returns `{ twoFactorToken }` for
   * `verifyTwoFactor`, and the user isn't logged in until then. */
  const login = useCallback(
    async (email, password) => {
      const result = await api('/auth/token', {
        method: 'POST',
        form: { username: email, password },
      });
      if (result.two_factor_required) return { twoFactorToken: result.two_factor_token };
      await startSession(result.access_token);
      return null;
    },
    [startSession],
  );

  /** The second step of logging in: a code from the authenticator app, or a recovery code. */
  const verifyTwoFactor = useCallback(
    async (twoFactorToken, code) => {
      const { access_token } = await api('/auth/2fa/verify', {
        method: 'POST',
        body: { two_factor_token: twoFactorToken, code },
      });
      await startSession(access_token);
    },
    [startSession],
  );

  /** Reload the user, e.g. after turning two-step verification on or off. */
  const refreshUser = useCallback(async () => setUser(await api('/users/me')), []);

  const register = useCallback(
    async (email, password) => {
      await api('/auth/register', { method: 'POST', body: { email, password } });
      await login(email, password);
    },
    [login],
  );

  const value = useMemo(
    () => ({ user, loading, login, verifyTwoFactor, refreshUser, logout, register }),
    [user, loading, login, verifyTwoFactor, refreshUser, logout, register],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
