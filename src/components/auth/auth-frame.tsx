import Link from "next/link";

/**
 * Two-column frame for sign-in and sign-up.
 *
 * Left side is the pitch; right side is the form card. The grid collapses to one
 * column on a narrow screen (`auto-fit`), so the form is never squeezed beside
 * the copy on a phone.
 */
export function AuthFrame({
  eyebrow,
  headline,
  sub,
  points,
  formTitle,
  swapHref,
  swapLabel,
  children,
}: {
  eyebrow: string;
  headline: string;
  sub: string;
  points: string[];
  formTitle: string;
  swapHref: string;
  swapLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto grid w-full max-w-[1010px] grid-cols-[repeat(auto-fit,minmax(min(100%,330px),1fr))] items-center gap-[clamp(24px,5vw,54px)]">
      <div className="max-w-[38ch] text-left">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-clay">
          {eyebrow}
        </p>
        <h1 className="mt-3 font-serif text-[clamp(30px,5.4vw,44px)] font-normal leading-[1.15] tracking-[-0.02em] text-espresso">
          {headline}
        </h1>
        <p className="mt-4 font-serif text-[18px] font-light leading-normal text-soft">
          {sub}
        </p>
        <ul className="mt-6 flex flex-col gap-2.5 rounded-panel bg-honey-light px-5 py-[18px]">
          {points.map((point) => (
            <li key={point} className="flex gap-2.5 text-[13.5px] text-[#7A5B3A]">
              <span aria-hidden="true" className="font-semibold text-clay">
                ·
              </span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-3.5 rounded-[20px] border border-border bg-card p-[clamp(20px,4vw,30px)] shadow-auth">
        <h2 className="font-serif text-2xl font-medium tracking-[-0.02em] text-espresso">
          {formTitle}
        </h2>
        {children}
        <Link
          href={swapHref}
          className="self-start rounded-lg px-1 py-1 text-[13px] font-semibold text-clay-text hover:bg-honey-light"
        >
          {swapLabel}
        </Link>
      </div>
    </div>
  );
}
