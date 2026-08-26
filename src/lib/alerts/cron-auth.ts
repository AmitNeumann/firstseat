import { timingSafeEqual } from "node:crypto";

/**
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Local curl uses the same
 * header so we can exercise the route without deploying.
 */
export function cronAuthorized(
  request: Request,
  secret = process.env.CRON_SECRET,
): boolean {
  if (!secret) {
    return false;
  }

  const header = request.headers.get("authorization");
  const expected = `Bearer ${secret}`;

  return safeEqual(header ?? "", expected);
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);

  if (a.length !== b.length) {
    return false;
  }

  return timingSafeEqual(a, b);
}
