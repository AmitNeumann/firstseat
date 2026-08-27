import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";

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
    <div className="flex min-h-full flex-col">
      <SiteHeader signedIn={false} />
      <main className="flex flex-1 flex-col justify-center px-[clamp(16px,5vw,32px)] py-10">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
