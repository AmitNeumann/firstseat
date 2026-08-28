import { SiteFooter } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";

/**
 * Page chrome: sticky header, growing main, footer pinned to the bottom of the viewport
 * on short pages. Every in-app screen should use this so the nav does not disappear and
 * the footer cannot float into the middle of a sparse dashboard.
 */
export function SiteShell({
  signedIn,
  current,
  user,
  children,
}: {
  signedIn: boolean;
  current?: "watches" | "restaurants";
  user?: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <SiteHeader signedIn={signedIn} current={current} user={user} />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </div>
  );
}
