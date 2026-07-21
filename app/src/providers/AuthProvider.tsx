import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { STORAGE_KEYS } from '@/constants/app.constants';
import { User } from '@/types/api.types';
import { secureStorage } from '@/services/secureStorage';

interface AuthContextValue {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isHydrating: boolean;
  setAuth: (token: string, user: User) => Promise<void>;
  clearAuth: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUserState] = useState<User | null>(null);
  const [isHydrating, setIsHydrating] = useState(true);

  useEffect(() => {
    secureStorage
      .getItem(STORAGE_KEYS.ACCESS_TOKEN)
      .then(setToken)
      .finally(() => setIsHydrating(false));
  }, []);

  const setAuth = useCallback(async (accessToken: string, authUser: User) => {
    await secureStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    setToken(accessToken);
    setUserState(authUser);
  }, []);

  const clearAuth = useCallback(async () => {
    await secureStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
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
      isHydrating,
      setAuth,
      clearAuth,
      setUser
    }),
    [token, user, isHydrating, setAuth, clearAuth, setUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
