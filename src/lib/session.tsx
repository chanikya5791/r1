import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { api, setToken, type User } from './api';
import { cartReducer, type CartAction, type CartLine } from './cart';

const TOKEN_KEY = 'shoplite.token';
const USER_KEY = 'shoplite.user';
const CART_KEY = 'shoplite.cart';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode); the session just won't persist
  }
}

interface Session {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  cart: CartLine[];
  dispatchCart: (a: CartAction) => void;
}

const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const token = read<string | null>(TOKEN_KEY, null);
    setToken(token);
    return token ? read<User | null>(USER_KEY, null) : null;
  });
  const [cart, dispatchCart] = useReducer(cartReducer, undefined, () => read<CartLine[]>(CART_KEY, []));

  useEffect(() => write(CART_KEY, cart), [cart]);

  const logout = useCallback(() => {
    setToken(null);
    write(TOKEN_KEY, null);
    write(USER_KEY, null);
    setUser(null);
  }, []);

  // Drop a stored token that has expired or was signed with another secret.
  useEffect(() => {
    if (!user) return;
    api.me().then(setUser, (err) => {
      if (err?.status === 401) logout();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api.login({ email, password });
    setToken(res.token);
    write(TOKEN_KEY, res.token);
    write(USER_KEY, res.user);
    setUser(res.user);
    return res.user;
  }, []);

  const value = useMemo(() => ({ user, login, logout, cart, dispatchCart }), [user, login, logout, cart]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): Session {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
