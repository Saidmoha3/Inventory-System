import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { api, getToken, setToken } from '../lib/api';
import { UserProfile, UserRole } from '../types';

export interface AppUser {
  id: string;
  email: string;
  user_metadata: { name: string };
}

interface AuthContextType {
  user: AppUser | null;
  profile: UserProfile | null;
  loading: boolean;
  loginWithCredentials: (username: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const toAppUser = (p: UserProfile): AppUser => ({
  id: p.id,
  email: p.email,
  user_metadata: { name: p.name }
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const applyProfile = (p: UserProfile | null) => {
    setProfile(p);
    setUser(p ? toAppUser(p) : null);
    if (p) {
      localStorage.setItem('inventory_pro_user_session', JSON.stringify(p));
    } else {
      localStorage.removeItem('inventory_pro_user_session');
    }
  };

  const loginWithCredentials = async (username: string, pass: string) => {
    const ident = username.trim().toLowerCase();

    // 1. If Supabase is configured with real credentials, authenticate via Supabase
    if (isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .or(`username.ilike.${ident},email.ilike.${ident}`)
          .eq('password', pass)
          .single();

        if (error || !data) {
          throw new Error('Username ama password waa khalad (Invalid credentials)');
        }

        const userProfile: UserProfile = {
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role as UserRole,
          address: data.address,
          locationIds: data.location_ids || [],
          createdAt: data.created_at
        };

        applyProfile(userProfile);
        return;
      } catch (err: any) {
        if (
          err?.name === 'TypeError' || 
          err?.message?.includes('Failed to fetch') || 
          err?.message?.includes('NetworkError')
        ) {
          throw new Error(
            'Cilad: Supabase lama xiriiri karo (Failed to fetch). Fadlan hubi in VITE_SUPABASE_URL uu sax yahay, internet-kuna shaqeynayo.'
          );
        }
        throw err;
      }
    }

    // 2. Otherwise, authenticate seamlessly via the local SQLite backend API
    const res = await api<{ token: string; user: UserProfile }>('POST', '/auth/login', {
      username: username.trim(),
      password: pass
    });
    setToken(res.token);
    applyProfile(res.user);
  };

  const refreshProfile = async () => {
    if (!profile) return;
    try {
      if (isSupabaseConfigured()) {
        const { data } = await supabase.from('users').select('*').eq('id', profile.id).single();
        if (data) {
          applyProfile({
            id: data.id,
            email: data.email,
            name: data.name,
            role: data.role as UserRole,
            address: data.address,
            locationIds: data.location_ids || [],
            createdAt: data.created_at
          });
        }
      } else {
        const p = await api<UserProfile>('GET', '/auth/me');
        if (p) applyProfile(p);
      }
    } catch (e) {
      console.error('Error refreshing profile:', e);
    }
  };

  const logout = async () => {
    if (!isSupabaseConfigured() && getToken()) {
      try {
        await api('POST', '/auth/logout');
      } catch {
        /* ignore */
      }
      setToken(null);
    }
    applyProfile(null);
  };

  useEffect(() => {
    const onExpired = () => applyProfile(null);
    window.addEventListener('auth-expired', onExpired);

    const saved = localStorage.getItem('inventory_pro_user_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfile(parsed);
        setUser(toAppUser(parsed));
      } catch (e) {
        console.error('Session parse error:', e);
      }
    }

    // If local backend mode and we have a token, verify with server
    if (!isSupabaseConfigured() && getToken()) {
      api<UserProfile>('GET', '/auth/me')
        .then(applyProfile)
        .catch(() => applyProfile(null))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => window.removeEventListener('auth-expired', onExpired);
  }, []);

  const isAdmin = profile?.role === 'Admin';
  const isManager = profile?.role === 'Manager' || isAdmin;
  const isStaff = profile?.role === 'Staff' || isManager;

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      loginWithCredentials,
      logout,
      refreshProfile,
      isAdmin,
      isManager,
      isStaff
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
