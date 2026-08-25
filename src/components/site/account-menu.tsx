"use client";

import Link from "next/link";
import { useState } from "react";

import { SignOutButton } from "@/components/auth/sign-out-button";

/**
 * Signed-in account control: initials avatar that opens Settings and Sign out.
 *
 * The menu shows the full name (when set) with the email underneath; otherwise the
 * email line as before. Sign out stays a POST form so a prefetch cannot log people out.
 */
export function AccountMenu({
  email,
  initials,
  displayName,
}: {
  email: string;
  initials: string;
  /** Full name when set; the menu falls back to the email line when this is null. */
  displayName: string | null;
}) {
  const [open, setOpen] = useState(false);

  function handleBlur(event: React.FocusEvent<HTMLDivElement>): void {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setOpen(false);
    }
  }

  return (
    <div className="relative" onBlur={handleBlur}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        onClick={() => setOpen((value) => !value)}
        className={`flex size-9 items-center justify-center rounded-full bg-honey font-semibold
                   text-clay-text hover:bg-apricot ${
                     initials.length > 1 ? "text-xs" : "text-sm"
                   }`}
      >
        {initials}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-2 min-w-56 overflow-hidden rounded-[12px]
                     border border-border bg-card py-1 shadow-menu"
        >
          <div className="border-b border-border px-3.5 py-2">
            {displayName ? (
              <>
                <div className="truncate text-[13.5px] font-semibold text-espresso">
                  {displayName}
                </div>
                <div className="truncate text-[11px] text-muted">{email}</div>
              </>
            ) : (
              <div className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                {email}
              </div>
            )}
          </div>
          <Link
            href="/settings"
            role="menuitem"
            className="block px-3.5 py-2 text-[13.5px] font-medium text-espresso
                       hover:bg-honey-light"
            onClick={() => setOpen(false)}
          >
            Settings
          </Link>
          <div className="border-t border-border" role="none">
            <SignOutButton
              className="w-full px-3.5 py-2 text-left text-[13.5px] font-medium text-muted
                         hover:bg-warm-cream hover:text-soft"
            />
          </div>
        </div>
      )}
    </div>
  );
}
