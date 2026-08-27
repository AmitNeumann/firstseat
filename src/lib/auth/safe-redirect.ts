import { NextResponse, type NextRequest } from "next/server";

/**
 * Confines a post-auth redirect to this site.
 *
 * `next` arrives from a URL the recipient can edit, so without this a crafted link
 * could bounce a freshly signed-in user straight to an attacker's page.
 */
export function safeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export function redirectNoStore(request: NextRequest, path: string): NextResponse {
  const response = NextResponse.redirect(new URL(path, request.nextUrl.origin));

  // This response can carry `Set-Cookie` headers for a session. Caching it anywhere
  // shared would hand that session to whoever asked next.
  response.headers.set("Cache-Control", "private, no-store");

  return response;
}
