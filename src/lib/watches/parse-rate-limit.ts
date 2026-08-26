/**
 * A crude per-user cap on the parse endpoint.
 *
 * There is no rate limit anywhere else in the app; this is the first call that costs
 * money (or free-tier quota) per request. The map lives in process memory, so it resets
 * on deploy and is not shared across Vercel instances — honest enough for a course demo,
 * not a billing firewall.
 */

const WINDOW_MS = 24 * 60 * 60 * 1000;

export const PARSE_MAX_CALLS_PER_DAY = 30;

const hits = new Map<string, number[]>();

/** True when this user still has allowance; records the hit when so. */
export function consumeParseAllowance(userId: string, now = Date.now()): boolean {
  const recent = (hits.get(userId) ?? []).filter((at) => now - at < WINDOW_MS);

  if (recent.length >= PARSE_MAX_CALLS_PER_DAY) {
    hits.set(userId, recent);
    return false;
  }

  recent.push(now);
  hits.set(userId, recent);
  return true;
}
