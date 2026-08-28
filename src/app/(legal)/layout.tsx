import { SiteShell } from "@/components/site/shell";
import { getAppUser } from "@/lib/auth/dal";

/**
 * Shared frame for the public Terms and Privacy pages.
 *
 * A route group, so `(legal)` does not become a path segment. Signed-in visitors keep
 * the in-app nav; signed-out visitors see Sign in / Sign up — same sticky chrome as
 * the rest of the site. These routes do not require an account.
 */
export default async function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAppUser();

  return (
    <SiteShell signedIn={Boolean(user)} user={user ?? undefined}>
      <main
        className="mx-auto w-full max-w-[42rem] flex-1
                   px-[clamp(16px,5vw,32px)] pt-[clamp(28px,6vw,52px)] pb-20"
      >
        {children}
      </main>
    </SiteShell>
  );
}
