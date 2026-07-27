'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { User } from '@/types';

/**
 * Authentication context.
 *
 * Phase 5 ships the shape and the hook only — no requests. Phase 6 replaces
 * the placeholder state with a TanStack Query call to `GET /auth/me`, so
 * consumers written now will not need to change.
 */

export interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isStaff: boolean;
  setUser: (user: User | null) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: ReactNode;
  initialUser?: User | null;
}): JSX.Element {
  const [user, setUser] = useState<User | null>(initialUser);

  const signOut = useCallback(() => setUser(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      // Phase 5 never loads, so this is always false; Phase 6 wires it to the query.
      isLoading: false,
      isStaff: user?.role === 'admin' || user?.role === 'manager',
      setUser,
      signOut,
    }),
    [user, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
