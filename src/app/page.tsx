import { redirect } from "next/navigation";

import { FeatureIcon } from "@/components/landing/feature-icon";
import { LandingTryIt } from "@/components/landing/try-it-card";
import { SiteShell } from "@/components/site/shell";
import { getAuthUser } from "@/lib/auth/dal";
import { getLandingDemoRestaurant } from "@/lib/watches/queries";

export default async function Home() {
  // Deliberately the auth user and not the app user: a public page should not trigger a
  // database write just to decide which link to show.
  if (await getAuthUser()) {
    redirect("/dashboard");
  }

  // One restaurant, by name. The rest of the catalog never leaves the server.
  const demoRestaurant = await getLandingDemoRestaurant();

  return (
    <SiteShell signedIn={false}>
      <main className="mx-auto flex w-full max-w-[1060px] flex-1 flex-col items-center gap-5 px-[clamp(16px,5vw,32px)] pt-[clamp(40px,8vw,86px)] pb-[72px] text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-clay">
          New York
        </p>

        <h1 className="max-w-[20ch] font-display text-[clamp(34px,7vw,58px)] font-semibold leading-[1.04] tracking-[-0.028em] text-espresso">
          Be first in line for New York&apos;s hardest tables.
        </h1>

        <p className="max-w-[46ch] font-serif text-[clamp(17px,2.4vw,21px)] font-light leading-normal text-soft">
          We know the minute each restaurant releases its book — and we tap you minutes
          before, in your own timezone, with the booking link ready.
        </p>

        <LandingTryIt restaurant={demoRestaurant} />

        <section className="mt-[clamp(26px,6vw,52px)] grid w-full grid-cols-[repeat(auto-fit,minmax(min(100%,230px),1fr))] gap-3.5">
          <article className="rounded-panel border border-border bg-card p-[22px] text-left">
            <div className="flex items-center gap-3">
              <FeatureIcon name="table" className="size-7 shrink-0 text-clay" />
              <h2 className="font-serif text-[21px] font-medium tracking-[-0.02em] text-espresso">
                Just describe it
              </h2>
            </div>
            <p className="mt-2 text-[13.5px] text-muted">
              A sentence is enough. We resolve the restaurant, date, meal and party.
            </p>
          </article>

          <article className="rounded-panel border border-honey-border bg-honey-light p-[22px] text-left">
            <div className="flex items-center gap-3">
              <FeatureIcon name="math" className="size-7 shrink-0 text-honey-muted" />
              <h2 className="font-serif text-[21px] font-medium tracking-[-0.02em] text-espresso">
                We do the math
              </h2>
            </div>
            <p className="mt-2 text-[13.5px] text-honey-muted">
              Each room&apos;s release rule, converted to New York time and yours.
            </p>
          </article>

          <article className="rounded-panel border border-[#E8CFA0] bg-honey p-[22px] text-left">
            <div className="flex items-center gap-3">
              <FeatureIcon name="reveal" className="size-7 shrink-0 text-clay-text" />
              <h2 className="font-serif text-[21px] font-medium tracking-[-0.02em] text-clay-text">
                The reveal
              </h2>
            </div>
            <p className="mt-2 text-[13.5px] text-[#8A5A2E]">
              Minutes before the drop, your phone buzzes with the link.
            </p>
          </article>
        </section>
      </main>
    </SiteShell>
  );
}