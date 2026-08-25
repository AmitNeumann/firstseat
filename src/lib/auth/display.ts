/**
 * How we write the signed-in person in the chrome: avatar letters and the My Watches
 * greeting. Kept pure so the fallbacks can be tested without rendering the header.
 */

export type NameParts = {
  firstName: string | null;
  lastName: string | null;
  email: string;
};

/**
 * Avatar letters: first + last initial when we have a name, otherwise the email's
 * first character. Never returns an empty string.
 */
export function avatarInitials({ firstName, lastName, email }: NameParts): string {
  const first = initial(firstName);
  const last = initial(lastName);

  if (first && last) {
    return `${first}${last}`;
  }

  if (first) {
    return first;
  }

  if (last) {
    return last;
  }

  const fromEmail = email.trim().charAt(0).toUpperCase();
  return fromEmail || "?";
}

/** Greeting given name, or null when we must not say "Hi". */
export function greetingFirstName(firstName: string | null): string | null {
  const trimmed = firstName?.trim();
  return trimmed ? trimmed : null;
}

/**
 * "Amit Neumann" for the account menu. Null when neither name is set, so the menu
 * can fall back to the email line it already showed.
 */
export function displayFullName({
  firstName,
  lastName,
}: Pick<NameParts, "firstName" | "lastName">): string | null {
  const parts = [firstName, lastName]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value));

  return parts.length > 0 ? parts.join(" ") : null;
}

function initial(value: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : null;
}
