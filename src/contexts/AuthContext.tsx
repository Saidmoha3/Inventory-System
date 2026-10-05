import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
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
      localStorage.setItem('inventory_pro_supabase_user', JSON.stringify(p));
    } else {
      localStorage.removeItem('inventory_pro_supabase_user');
    }
  };

  const loginWithCredentials = async (username: string, pass: string) => {
    const ident = username.trim().toLowerCase();

    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`username.ilike.${ident},email.ilike.${ident}`)
        .eq('password', pass)
        .single();

      if (error || !data) {
        if (
          error?.message?.includes('Failed to fetch') || 
          error?.message?.includes('fetch')
        ) {
          throw new Error('Supabase lama xiriiri karo (Failed to fetch). Fadlan hubi VITE_SUPABASE_URL iyo VITE_SUPABASE_ANON_KEY faylka .env ku jira.');
        }
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
    } catch (err: any) {
      if (
        err?.name === 'TypeError' ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError')
      ) {
        throw new Error('Supabase lama xiriiri karo (Failed to fetch). Fadlan hubi VITE_SUPABASE_URL iyo VITE_SUPABASE_ANON_KEY faylka .env ku jira.');
      }
      throw err;
    }
  };

  const refreshProfile = async () => {
    if (!profile) return;
    try {
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
    } catch (e) {
      console.error('Error refreshing profile:', e);
    }
  };

  const logout = async () => {
    applyProfile(null);
  };

  useEffect(() => {
    const saved = localStorage.getItem('inventory_pro_supabase_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProfile(parsed);
        setUser(toAppUser(parsed));
      } catch (e) {
        console.error('Session parse error:', e);
      }
    }
    setLoading(false);
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
