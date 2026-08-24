import Link from "next/link";

/**
 * Type-only mark: Fraunces plus a clay dot. The href changes with sign-in state — landing
 * when signed out, My Watches when signed in — so the same component cannot hard-code `/`.
 */
export function Logo({ href }: { href: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-baseline gap-[3px] font-display text-[19px] font-semibold
                 tracking-[-0.015em] text-espresso"
    >
      FirstSeat
      <span
        aria-hidden="true"
        className="inline-block size-1.5 translate-y-[-1px] rounded-full bg-clay"
      />
    </Link>
  );
}
