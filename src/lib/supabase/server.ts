import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Must be created per request: it reads the caller's session from their cookies.
 */
export async function createSupabaseServerClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components are not allowed to write cookies. Session refresh is
          // handled by `src/proxy.ts`, and Server Actions and Route Handlers can write
          // here, so ignoring this is safe.
        }
      },
    },
  });
}
