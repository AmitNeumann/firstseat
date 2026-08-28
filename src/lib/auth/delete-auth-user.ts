import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Deletes the currently signed-in Auth user.
 *
 * Uses GoTrue's `DELETE /user` with that user's JWT, so the caller can only remove
 * themselves — there is no admin key and no user id in the request body. Authorization
 * still belongs with `getUser()` / `requireAppUser()`; this only forwards the token.
 */
export async function deleteSignedInAuthUser(accessToken: string): Promise<boolean> {
  const { url, anonKey } = getSupabaseEnv();

  const response = await fetch(`${url}/auth/v1/user`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
    },
  });

  if (!response.ok) {
    console.error("[auth] DELETE /user failed:", response.status, await response.text());
    return false;
  }

  return true;
}
