/**
 * Supabase API credentials, read in one place so the three clients (browser, server,
 * proxy) fail the same way when configuration is missing.
 *
 * These must stay literal `process.env.NEXT_PUBLIC_*` expressions. Next.js inlines them
 * at build time and cannot resolve a dynamic lookup such as `process.env[name]` in code
 * that reaches the browser.
 */
export function getSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set. " +
        "Locally they belong in .env.local; in production add them to the Vercel project.",
    );
  }

  return { url, anonKey };
}
