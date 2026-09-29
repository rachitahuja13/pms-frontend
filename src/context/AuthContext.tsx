import { createContext, useState, type ReactNode } from 'react';
import { api, extractErrorMessage } from '../api/client';
import type { User, LoginResponse } from '../types';

export interface LoginResult {
  ok: boolean;
  message?: string;
}

export interface AuthContextValue {
  user: User | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('pms_user');
    return stored ? (JSON.parse(stored) as User) : null;
  });

  async function login(email: string, password: string): Promise<LoginResult> {
    try {
      const { data } = await api.post<LoginResponse>('/auth/login', { email, password });
      localStorage.setItem('pms_token', data.token);
      localStorage.setItem('pms_user', JSON.stringify(data.user));
      setUser(data.user);
      return { ok: true };
    } catch (err) {
      return { ok: false, message: extractErrorMessage(err, 'Invalid email or password.') };
    }
  }

  function logout() {
    localStorage.removeItem('pms_token');
    localStorage.removeItem('pms_user');
    setUser(null);
  }

  const value: AuthContextValue = {
    user,
    isAdmin: user?.role === 'ADMIN',
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
