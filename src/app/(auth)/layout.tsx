import { SiteShell } from "@/components/site/shell";

/**
 * Shared frame for the signed-out auth pages.
 *
 * A route group, so `(auth)` adds this layout without becoming a path segment: the pages
 * below it stay at `/login`, `/signup`, `/forgot-password`, and `/reset-password`.
 * Header and footer match the rest of the signed-out app; each page fills in the
 * two-column pitch + form.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SiteShell signedIn={false}>
      <main className="flex flex-1 flex-col justify-center px-[clamp(16px,5vw,32px)] py-10">
        {children}
      </main>
    </SiteShell>
  );
}
