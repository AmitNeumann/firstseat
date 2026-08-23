/**
 * Booking platforms.
 *
 * ── Why this is not a database enum ────────────────────────────────────────
 *
 * It used to be. A Postgres enum is the right choice for a closed set the application
 * reasons about — `WatchStatus` genuinely has five values and code branches on each of
 * them. The set of booking platforms is not that set. It is open-ended editorial data:
 * every restaurant we add might use one we have never seen, and nothing in the codebase
 * branches on which platform a rule uses. It is a label next to a link.
 *
 * Two things made the enum actively costly:
 *
 *  • Adding a value needs a schema migration, for what is really a typo-level data edit.
 *  • `ALTER TYPE … ADD VALUE` cannot be used in the same transaction that adds it, which
 *    fights the way Prisma wraps migrations.
 *
 * So the column is now text. The safety the enum provided is replaced by three checks
 * rather than dropped:
 *
 *  1. A `CHECK` constraint in the database restricts the column to a lowercase slug, so
 *     the guarantee is still enforced where the data lives, not just where it is written.
 *  2. Zod validates the same shape at the one place platforms are entered, the seed file.
 *  3. Platforms we know are cross-checked against the host their links live on, so a Tock
 *     URL labelled Resy is still caught.
 *
 * A platform we have not seen before is accepted and displayed. It just cannot be
 * cross-checked, because we have nothing to check it against.
 */

/** Matches the `CHECK` constraint on both `platform` columns. Keep the two in step. */
export const PLATFORM_SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Matches `@db.VarChar(40)` on both `platform` columns. */
export const MAX_PLATFORM_LENGTH = 40;

type KnownPlatform = {
  /** How the platform is written in the interface. */
  label: string;
  /**
   * The host its booking links live on, when there is exactly one. Absent means "any
   * host is plausible", which is true of a restaurant's own site and of anything we have
   * not looked into.
   */
  hostname?: string;
};

/**
 * The platforms we recognise, keyed by slug.
 *
 * This list is a convenience, not a constraint: it supplies a nicely written label and
 * enables the URL cross-check. Recording a platform that is not here is allowed.
 */
const KNOWN_PLATFORMS: Record<string, KnownPlatform> = {
  resy: { label: "Resy", hostname: "resy.com" },
  tock: { label: "Tock", hostname: "exploretock.com" },
  opentable: { label: "OpenTable", hostname: "opentable.com" },
  sevenrooms: { label: "SevenRooms", hostname: "sevenrooms.com" },
  doordash: { label: "DoorDash", hostname: "doordash.com" },
  yelp: { label: "Yelp", hostname: "yelp.com" },
  // No hostname on either of these: both mean "somewhere we are not going to guess".
  direct: { label: "the restaurant's own site" },
  other: { label: "another platform" },
};

/** The recognised slugs, for documentation and error messages. */
export const KNOWN_PLATFORM_SLUGS = Object.keys(KNOWN_PLATFORMS);

/**
 * Turns what a human typed into the canonical slug: "SevenRooms" becomes "sevenrooms",
 * "Table Check" becomes "table-check".
 *
 * Normalising rather than rejecting matters because otherwise the same platform arrives
 * as "Resy", "resy" and "RESY" and the database treats them as three platforms — which
 * would quietly break the one-rule-per-platform constraint.
 */
export function toPlatformSlug(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_]+/g, "-");
}

export function isPlatformSlug(value: string): boolean {
  return value.length <= MAX_PLATFORM_LENGTH && PLATFORM_SLUG_PATTERN.test(value);
}

/** "table-check" becomes "Table check" — sentence case, matching the rest of the UI. */
function humanise(slug: string): string {
  const words = slug.replaceAll("-", " ");

  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** How to write a platform in the interface. Unknown slugs are humanised rather than hidden. */
export function platformLabel(slug: string): string {
  return KNOWN_PLATFORMS[slug]?.label ?? humanise(slug);
}

/**
 * The host this platform's booking links belong on, or `undefined` when we have no
 * opinion — which is the answer for every platform we have not hardcoded.
 */
export function platformHostname(slug: string): string | undefined {
  return KNOWN_PLATFORMS[slug]?.hostname;
}

/** Whether a URL's host is the expected one, allowing subdomains such as `www.`. */
export function hostMatches(hostname: string, expected: string): boolean {
  return hostname === expected || hostname.endsWith(`.${expected}`);
}
