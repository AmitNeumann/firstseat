import Link from "next/link";

import { SignOutButton } from "@/components/auth/sign-out-button";
import { Logo } from "@/components/site/logo";

/**
 * Sticky chrome shared by every view.
 *
 * Signed-out visitors see Sign in / Sign up and no catalog tab — the restaurant list is
 * gated. Signed-in visitors see My Watches and New watch. The Restaurants tab arrives
 * with that screen; adding it here before the route exists would be a 404.
 */
export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header
      className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-border
                 bg-[rgba(252,251,247,0.93)] px-[clamp(14px,4vw,36px)] py-3.5 backdrop-blur-[10px]"
    >
      <Logo href={signedIn ? "/dashboard" : "/"} />

      {signedIn && (
        <nav className="flex flex-wrap items-center gap-1" aria-label="Primary">
          <Link
            href="/dashboard"
            className="rounded-lg bg-honey px-3 py-[7px] text-[13.5px] font-semibold text-[#5A2D18]
                       hover:bg-apricot"
          >
            My Watches
          </Link>
        </nav>
      )}

      <div className="ml-auto flex flex-wrap items-center gap-2">
        {signedIn ? (
          <>
            <Link
              href="/watches/new"
              className="rounded-[9px] bg-clay px-[15px] py-[9px] text-[13.5px] font-semibold
                         text-cream-on-clay hover:bg-clay-dark"
            >
              New watch
            </Link>
            <SignOutButton
              className="rounded-[9px] border border-border bg-card px-[13px] py-2
                         text-[13.5px] font-medium text-muted hover:bg-warm-cream hover:text-soft"
            />
          </>
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
