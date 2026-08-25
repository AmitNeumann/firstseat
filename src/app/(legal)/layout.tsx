import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";

/**
 * Shared frame for the public Terms and Privacy pages.
 *
 * A route group, so `(legal)` does not become a path segment. Header and footer match
 * the signed-out landing and auth screens. These routes do not call `requireAppUser`.
 */
export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader signedIn={false} />
      <main
        className="mx-auto w-full max-w-[42rem] flex-1
                   px-[clamp(16px,5vw,32px)] pt-[clamp(28px,6vw,52px)] pb-20"
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
