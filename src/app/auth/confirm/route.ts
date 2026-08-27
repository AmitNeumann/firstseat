import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest } from "next/server";

import type { ConfirmErrorKey } from "@/lib/auth/confirm-errors";
import { ensureAppUser } from "@/lib/auth/dal";
import { redirectNoStore, safeNextPath } from "@/lib/auth/safe-redirect";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Where the links in Supabase's auth emails land.
 *
 * A Route Handler rather than a page because this has to write the session cookies, which
 * a Server Component is not allowed to do.
 *
 * Two link shapes reach here, depending on the project's email templates:
 *
 * - `?code=…` — Supabase verified the token itself and handed back a PKCE code to
 *   exchange. This is what the default `{{ .ConfirmationURL }}` template produces.
 * - `?token_hash=…&type=…` — the token is verified here instead. This is what a template
 *   customised to use `{{ .TokenHash }}` produces.
 *
 * Both are handled so that editing an email template in the Supabase dashboard does not
 * quietly break signup.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  // Supabase appends these when it rejected the link before redirecting here, e.g. a
  // confirmation token that had already expired.
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");

  if (providerError) {
    console.error("[auth/confirm] provider rejected link:", providerError);

    return failure(request, recoveryFailure(searchParams, "link_expired"));
  }

  const supabase = await createSupabaseServerClient();

  const result = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : null;

  if (!result) {
    return failure(request, recoveryFailure(searchParams, "link_invalid"));
  }

  if (result.error || !result.data.user) {
    console.error("[auth/confirm] could not establish session:", result.error);

    const mismatch =
      result.error?.code === "flow_state_not_found" ||
      Boolean(result.error?.message?.includes("code verifier"));

    return failure(
      request,
      recoveryFailure(
        searchParams,
        mismatch ? "link_mismatch" : "link_expired",
      ),
    );
  }

  // The session cookies now exist, so this is the user's first sign-in: create the row
  // that links them to application data.
  await ensureAppUser(result.data.user);

  return redirectNoStore(request, safeNextPath(searchParams.get("next")));
}

function recoveryFailure(
  searchParams: URLSearchParams,
  reason: Extract<ConfirmErrorKey, "link_expired" | "link_invalid" | "link_mismatch">,
): ConfirmErrorKey {
  const next = searchParams.get("next");
  const type = searchParams.get("type");
  const isReset = next === "/reset-password" || type === "recovery";

  if (!isReset) {
    return reason;
  }

  if (reason === "link_mismatch") {
    return "reset_mismatch";
  }

  if (reason === "link_invalid") {
    return "reset_invalid";
  }

  return "reset_expired";
}

function failure(request: NextRequest, reason: ConfirmErrorKey) {
  const path = reason.startsWith("reset_")
    ? `/forgot-password?error=${reason}`
    : `/login?error=${reason}`;

  return redirectNoStore(request, path);
}
