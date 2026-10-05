/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

export const isSupabaseConfigured = (): boolean => {
  if (!rawUrl || !rawKey) return false;
  if (
    rawUrl.includes('placeholder') || 
    rawUrl.includes('xyz123') || 
    rawUrl.includes('your-project')
  ) {
    return false;
  }
  if (
    rawKey.includes('placeholder') || 
    rawKey === 'public-anon-key' || 
    rawKey.includes('your-supabase')
  ) {
    return false;
  }
  return true;
};

// Safe fallback URL if not configured so createClient doesn't crash on module evaluation
const supabaseUrl = isSupabaseConfigured() ? rawUrl : 'https://dummy-project.supabase.co';
const supabaseAnonKey = isSupabaseConfigured() ? rawKey : 'dummy-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
