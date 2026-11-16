import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[tariq-admin] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
  );
}

/**
 * Typed at the call-site via lib/types. Avoids brittle generated Database
 * generics that can collapse Insert/Update to `never` without CLI codegen.
 */
export const supabase: SupabaseClient = createClient(
  supabaseUrl ?? "",
  supabaseAnonKey ?? "",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);
