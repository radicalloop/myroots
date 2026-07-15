import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { STORAGE_KEYS } from '@/constants/app.constants';
import { User } from '@/types/api.types';

interface AuthContextValue {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN),
  );
  const [user, setUserState] = useState<User | null>(null);

  const setAuth = useCallback((accessToken: string, authUser: User) => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    setToken(accessToken);
    setUserState(authUser);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    setToken(null);
    setUserState(null);
  }, []);

  const setUser = useCallback((authUser: User) => {
    setUserState(authUser);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      setAuth,
      clearAuth,
      setUser,
    }),
    [token, user, setAuth, clearAuth, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
