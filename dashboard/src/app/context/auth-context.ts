import { createContext, useContext } from 'react';

export type AuthUser = {
  id?: string;
  email: string;
  role: 'business' | 'agent';
  display_name?: string;
  company_name?: string;
  phone?: string;
  wallet_balance?: number;
  createdAt?: string;
};

export type AccountStats = {
  campaigns?: number;
  active_campaigns?: number;
  agents?: number;
  total_clicks?: number;
  total_requests?: number;
};

export type AuthContextType = {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser, refreshToken?: string) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshSession: () => Promise<boolean>;
  updateUser: (user: AuthUser) => void;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
