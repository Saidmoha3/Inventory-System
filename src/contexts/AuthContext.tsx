import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { getUserProfile, createUserProfile } from '../lib/db';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  loginAsRole: (role: UserRole) => void;
  loginWithCredentials: (username: string, pass: string) => void;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loginWithCredentials = (username: string, pass: string) => {
    if (username === 'admin' && pass === 'admin123') return loginAsRole('Admin');
    if (username === 'manager' && pass === 'manager123') return loginAsRole('Manager');
    if (username === 'staff' && pass === 'staff123') return loginAsRole('Staff');
    throw new Error('Username ama password waa khalad (Invalid credentials)');
  };

  const loginAsRole = (role: UserRole) => {
    const roleProfiles: Record<UserRole, { name: string; email: string }> = {
      Admin: { name: 'Maamulaha Guud', email: 'admin@garowesupermarket.com' },
      Manager: { name: 'Maareeyaha Ganacsiga', email: 'manager@garowesupermarket.com' },
      Staff: { name: 'Shaqaalaha Iibka', email: 'staff@garowesupermarket.com' }
    };

    const info = roleProfiles[role] || roleProfiles.Admin;
    const localProfile: UserProfile = {
      id: `${role.toLowerCase()}_user_id`,
      email: info.email,
      name: info.name,
      role: role,
      locationIds: [],
      createdAt: new Date()
    };

    localStorage.setItem('inventory_pro_local_user', JSON.stringify(localProfile));
    localStorage.setItem('inventory_pro_local_mode', role);

    setUser({
      id: localProfile.id,
      email: localProfile.email,
      user_metadata: { name: localProfile.name }
    } as unknown as User);

    setProfile(localProfile);
    setLoading(false);
  };

  useEffect(() => {
    // 1. Check if user already has an active local session
    const savedLocal = localStorage.getItem('inventory_pro_local_user');
    const localMode = localStorage.getItem('inventory_pro_local_mode') as UserRole | null;

    if (savedLocal) {
      try {
        const parsed = JSON.parse(savedLocal) as UserProfile;
        setUser({
          id: parsed.id,
          email: parsed.email,
          user_metadata: { name: parsed.name }
        } as unknown as User);
        setProfile(parsed);
        setLoading(false);
        return;
      } catch (e) {
        console.error('Error parsing local user session:', e);
      }
    } else if (localMode && (localMode === 'Admin' || localMode === 'Manager' || localMode === 'Staff')) {
      loginAsRole(localMode);
      return;
    }

    // 2. Listen to Supabase Auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthChange(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleAuthChange = async (supabaseUser: User | null) => {
    if (localStorage.getItem('inventory_pro_local_user')) {
      return;
    }

    setUser(supabaseUser);
    
    if (supabaseUser) {
      let userProfile = await getUserProfile(supabaseUser.id);
      
      if (!userProfile) {
        userProfile = {
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || 'User',
          role: 'Admin', // Default to Admin for convenience
          locationIds: [],
          createdAt: new Date()
        };
        try {
          await createUserProfile(supabaseUser.id, userProfile);
        } catch (err) {
          console.warn('Could not save user profile remotely, using local:', err);
        }
      }
      
      setProfile(userProfile);
    } else {
      setProfile(null);
    }
    
    setLoading(false);
  };

  const login = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Google Sign In Error:', error);
      alert(`Cilad: ${error.message || 'Waa la diiday'}. Waxaad isticmaali kartaa doorarka tooska ah ee sare.`);
    }
  };

  const logout = async () => {
    localStorage.removeItem('inventory_pro_local_user');
    localStorage.removeItem('inventory_pro_local_mode');
    setUser(null);
    setProfile(null);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out error:', e);
    }
  };

  const isAdmin = profile?.role === 'Admin';
  const isManager = profile?.role === 'Manager' || isAdmin;
  const isStaff = profile?.role === 'Staff' || isManager;

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      login, 
      loginAsRole,
      loginWithCredentials,
      logout,
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
