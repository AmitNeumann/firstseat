import { headers } from "next/headers";

/**
 * The absolute origin to build links that Supabase emails back to the user.
 *
 * A relative path is not an option: the link is followed from an email client, days later,
 * with no knowledge of where the app is deployed.
 *
 * Server Actions arrive as a same-origin POST, so `Origin` is normally present and is the
 * most accurate answer — it distinguishes localhost from a preview deployment from
 * production without any configuration. The rest are fallbacks for contexts that have no
 * such header.
 */
export async function getSiteOrigin(): Promise<string> {
  const requestOrigin = (await headers()).get("origin");

  if (requestOrigin) {
    return requestOrigin;
  }

  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }

  // Injected by Vercel per deployment, and carries no protocol.
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}
