import { createBrowserClient } from "@supabase/ssr";

// These must be referenced as literal `process.env.NEXT_PUBLIC_*` expressions:
// Next.js inlines them at build time and cannot resolve dynamic lookups in browser code.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Supabase client for Client Components. Reads the session from browser cookies. */
export function createSupabaseBrowserClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local.",
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
