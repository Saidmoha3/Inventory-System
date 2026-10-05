/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 
  (import.meta.env.VITE_SUPABASE_URL as string) || 
  (import.meta.env.NEXT_PUBLIC_SUPABASE_URL as string) || 
  'https://oaxkzmzyixuxtqhgncap.supabase.co';

const supabaseAnonKey = 
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 
  (import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY as string) || 
  (import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string) || 
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || 
  'sb_publishable_4NS7qRFyzBWHI-rp523G6Q_sb_VqxAo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

