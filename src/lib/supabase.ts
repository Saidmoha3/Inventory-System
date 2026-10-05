/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const rawUrl = 
  (import.meta.env.VITE_SUPABASE_URL as string) || 
  (import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string) || 
  '';

const isInvalidUrl = 
  !rawUrl || 
  rawUrl.includes('placeholder') || 
  rawUrl.includes('xyz123') || 
  rawUrl.includes('your-project') || 
  !rawUrl.startsWith('http');

export const supabaseUrl = isInvalidUrl 
  ? 'https://oaxkzmzyixuxtqhgncap.supabase.co' 
  : rawUrl.trim();

const rawKey = 
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 
  (import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string) || 
  (import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string) || 
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || 
  '';

const isInvalidKey = 
  !rawKey || 
  rawKey.includes('placeholder') || 
  rawKey.includes('public-anon-key') || 
  rawKey.includes('your-supabase');

export const supabaseAnonKey = isInvalidKey 
  ? 'sb_publishable_4NS7qRFyzBWHI-rp523G6Q_sb_VqxAo' 
  : rawKey.trim();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
