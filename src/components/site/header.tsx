import Link from "next/link";

import { AccountMenu } from "@/components/site/account-menu";
import { Logo } from "@/components/site/logo";
import { avatarInitials, displayFullName } from "@/lib/auth/display";

/**
 * Sticky chrome shared by every view.
 *
 * Signed-out visitors see Sign in / Sign up and no catalog tab. Signed-in visitors see
 * My Watches, Restaurants, and an avatar menu (Settings + Sign out). New watch lives on
 * the My Watches page — it is a page action, not global nav.
 */
export function SiteHeader({
  signedIn,
  current,
  user,
}: {
  signedIn: boolean;
  current?: "watches" | "restaurants";
  /** The signed-in person: email for the menu, names for avatar initials. */
  user?: {
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
}) {
  return (
    <header
      className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-border
                 bg-[rgba(252,251,247,0.93)] px-[clamp(14px,4vw,36px)] py-3.5 backdrop-blur-[10px]
                 shrink-0"
    >
      <Logo href={signedIn ? "/dashboard" : "/"} />

      {signedIn && (
        <nav className="flex flex-wrap items-center gap-1" aria-label="Primary">
          <NavTab href="/dashboard" active={current === "watches"}>
            My Watches
          </NavTab>
          <NavTab href="/restaurants" active={current === "restaurants"}>
            Restaurants
          </NavTab>
        </nav>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {signedIn ? (
          <AccountMenu
            email={user?.email ?? ""}
            initials={user ? avatarInitials(user) : "?"}
            displayName={user ? displayFullName(user) : null}
          />
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-[9px] border border-border-warm bg-card px-3.5 py-2
                         text-[13.5px] font-semibold text-clay-text hover:border-apricot
                         hover:bg-honey-light"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-[9px] bg-clay px-[15px] py-[9px] text-[13.5px] font-semibold
                         text-cream-on-clay hover:bg-clay-dark"
            >
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

function NavTab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "rounded-lg bg-honey px-3 py-[7px] text-[13.5px] font-semibold text-[#5A2D18] hover:bg-apricot"
          : "rounded-lg px-3 py-[7px] text-[13.5px] font-medium text-muted hover:bg-warm-cream hover:text-soft"
      }
    >
      {children}
    </Link>
  );
}
