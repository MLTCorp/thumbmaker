import { createClient } from '@supabase/supabase-js';

// Public Supabase client (uses anon key)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Service role client (bypasses RLS - use server-side only)
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Check if Supabase is configured
const isSupabaseConfigured = supabaseUrl && supabaseUrl.startsWith('http');

// Only create client if configuration is valid
export const supabase = isSupabaseConfigured
  ? createClient(
      supabaseUrl!,
      supabaseAnonKey || ''
    )
  : null;

// Service role client for server-side operations that need elevated permissions
export const supabaseAdmin = isSupabaseConfigured
  ? createClient(
      supabaseUrl!,
      supabaseServiceKey || ''
    )
  : null;
