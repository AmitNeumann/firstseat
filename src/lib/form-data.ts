/**
 * `FormData.get` returns `null` for a field that was never submitted, but Zod only applies
 * a schema default for `undefined`. Reading every field through this keeps a missing
 * field taking its default instead of failing validation for the wrong reason.
 */
export function field(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);

  return typeof value === "string" ? value : undefined;
}
