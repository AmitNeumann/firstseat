import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { ensureAppUser } from "@/lib/auth/dal";
import { OAUTH_TZ_COOKIE } from "@/lib/auth/oauth-timezone";
import { redirectNoStore, safeNextPath } from "@/lib/auth/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isKnownTimezone } from "@/lib/time";

/**
 * Google (via Supabase) returns here with a PKCE `code`.
 *
 * A Route Handler rather than a page because this has to write the session cookies, which
 * a Server Component is not allowed to do. After the exchange we call `getUser()` — not
 * `getSession()` — and then `ensureAppUser`, the same row-creation path as email sign-in.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");

  if (providerError) {
    console.error("[auth/callback] provider rejected sign-in:", providerError);
    const denied =
      providerError.toLowerCase().includes("denied") ||
      providerError.toLowerCase().includes("access_denied");

    return redirectNoStore(
      request,
      denied ? "/login?error=oauth_denied" : "/login?error=oauth_failed",
    );
  }

  const code = searchParams.get("code");

  if (!code) {
    return redirectNoStore(request, "/login?error=oauth_failed");
  }

  const supabase = await createSupabaseServerClient();
  const exchanged = await supabase.auth.exchangeCodeForSession(code);

  if (exchanged.error) {
    console.error("[auth/callback] could not exchange code:", exchanged.error);
    return redirectNoStore(request, "/login?error=oauth_failed");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("[auth/callback] getUser failed after exchange:", userError);
    return redirectNoStore(request, "/login?error=oauth_failed");
  }

  const cookieStore = await cookies();
  const timezoneCookie = cookieStore.get(OAUTH_TZ_COOKIE)?.value;
  cookieStore.delete(OAUTH_TZ_COOKIE);

  await ensureAppUser(user, {
    timezone:
      timezoneCookie && isKnownTimezone(timezoneCookie) ? timezoneCookie : undefined,
  });

  return redirectNoStore(request, safeNextPath(searchParams.get("next")));
}
