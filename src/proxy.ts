import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Keeps the Supabase auth session alive.
 *
 * `@supabase/ssr` keeps the session in cookies and rotates the access token once it
 * expires. Server Components are not allowed to write cookies, so without a request-level
 * hook like this one the rotated token would be computed and then thrown away, and users
 * would be signed out mid-visit.
 *
 * This runs no authorization checks on purpose. Server Functions are POST requests to the
 * route that defines them, so a matcher edit or a moved action can silently drop them out
 * of proxy coverage. Every protected page and action therefore re-checks the user itself
 * through `@/lib/auth/dal`.
 */
export async function proxy(request: NextRequest) {
  const { url, anonKey } = getSupabaseEnv();

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        // Update the request too, so the page rendered downstream in this same pass sees
        // the refreshed token rather than the expired one.
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }

        // Supabase supplies no-store headers alongside any response that sets auth
        // cookies. Applying them is what stops a CDN from caching this response and
        // handing one user's session cookie to the next visitor.
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Verifies the JWT with Supabase and, when it has expired, performs the refresh that
  // triggers `setAll` above.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Everything except Next.js internals and static assets: session refresh costs a
    // network call, so it should not run for every image and script request.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
