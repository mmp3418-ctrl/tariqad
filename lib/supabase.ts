import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** Live project fallbacks — builds/client never fail if env is missing. */
export const SUPABASE_URL =
  "https://nadtedqjgdiefqttuobz.supabase.co";
export const SUPABASE_ANON_KEY =
  "sb_publishable_npY_3zDJCPtQqnwQwVkFaA_OODQR_O3";

const url =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || SUPABASE_URL;
const anonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || SUPABASE_ANON_KEY;

export const supabaseUrl = url;
export const supabaseAnonKey = anonKey;

export function hasSupabaseConfig(): boolean {
  return Boolean(url && anonKey);
}

export const supabase: SupabaseClient = createClient(url, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});