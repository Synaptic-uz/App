import React, { useState, useEffect, useCallback } from 'react';
import { api, clearAuthSession, getStoredToken, persistAuthSession } from '../../lib/api';
import { AuthContext, type AuthUser } from './auth-context';

export { useAuth } from './auth-context';
export type { AuthUser };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySession = useCallback((accessToken: string, sessionUser: AuthUser) => {
    setToken(accessToken);
    setUser(sessionUser);
    persistAuthSession({ token: accessToken, user: sessionUser });
  }, []);

  const refreshSession = useCallback(async () => {
    const newToken = await api.refresh();
    if (!newToken) {
      setToken(null);
      setUser(null);
      clearAuthSession();
      return false;
    }
    try {
      const { user: me } = await api.me();
      applySession(newToken, me);
      return true;
    } catch {
      clearAuthSession();
      setToken(null);
      setUser(null);
      return false;
    }
  }, [applySession]);

  useEffect(() => {
    async function bootstrap() {
      const savedToken = getStoredToken();
      const savedUser = localStorage.getItem('user');

      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const parsedUser = savedUser ? (JSON.parse(savedUser) as AuthUser) : null;
        setToken(savedToken);
        if (parsedUser) setUser(parsedUser);

        const { user: me } = await api.me();
        applySession(savedToken, me);
      } catch {
        // `api.me()` already attempts one refresh on 401/403.
        // If bootstrap still lands here, treat the session as invalid and clear it.
        clearAuthSession();
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    bootstrap();
  }, [applySession, refreshSession]);

  const login = (newToken: string, newUser: AuthUser, refreshToken?: string) => {
    applySession(newToken, newUser);
    if (refreshToken) {
      persistAuthSession({ token: newToken, refreshToken, user: newUser });
    }
  };

  const logout = async () => {
    await api.logout();
    setToken(null);
    setUser(null);
  };

  const updateUser = useCallback((sessionUser: AuthUser) => {
    setUser(sessionUser);
    const access = token || getStoredToken();
    if (access) persistAuthSession({ token: access, user: sessionUser });
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token && !!user,
        isLoading,
        refreshSession,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
