/**
 * Names from Supabase `user_metadata`, for both email signup and Google OAuth.
 *
 * Metadata is user-controlled (and Google-controlled), so it is clipped here rather than
 * trusted. Email signup stores `firstName` / `lastName`; Google usually sends
 * `given_name` / `family_name` or a single `full_name`.
 */

const NAME_MAX = 40;

export type ProfileNames = {
  firstName: string | null;
  lastName: string | null;
};

export function namesFromAuthMetadata(
  metadata: Record<string, unknown> | null | undefined,
): ProfileNames {
  const first =
    clipName(metadata?.firstName) ?? clipName(metadata?.given_name);
  const last =
    clipName(metadata?.lastName) ?? clipName(metadata?.family_name);

  if (first || last) {
    return { firstName: first, lastName: last };
  }

  return splitFullName(
    clipName(metadata?.full_name) ?? personName(metadata?.name),
  );
}

function personName(value: unknown): string | null {
  if (typeof value !== "string" || value.includes("@")) {
    return null;
  }

  return clipName(value);
}

function splitFullName(full: string | null): ProfileNames {
  if (!full) {
    return { firstName: null, lastName: null };
  }

  const space = full.indexOf(" ");

  if (space === -1) {
    return { firstName: full, lastName: null };
  }

  return {
    firstName: clipName(full.slice(0, space)),
    lastName: clipName(full.slice(space + 1)),
  };
}

function clipName(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().replace(/\s+/g, " ");

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, NAME_MAX);
}
