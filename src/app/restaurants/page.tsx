import type { Metadata } from "next";

import { RestaurantCatalog } from "@/components/restaurants/catalog";
import { SiteShell } from "@/components/site/shell";
import { requireAppUser } from "@/lib/auth/dal";
import { listRestaurantOptions } from "@/lib/watches/queries";

export const metadata: Metadata = {
  title: "The list — FirstSeat",
};

/**
 * The signed-in restaurant catalog.
 *
 * Restaurants are public reference data, so this list is not scoped by userId — there is
 * nothing personal in it. The page is still behind `requireAppUser()`: signed-out visitors
 * have no tab and hitting this URL sends them to sign in, the same gate as My Watches.
 */
export default async function RestaurantsPage() {
  const user = await requireAppUser();
  const restaurants = await listRestaurantOptions();

  // Chrome (sticky header + footer) comes from SiteShell — do not render SiteHeader here.
  return (
    <SiteShell signedIn current="restaurants" user={user}>
      <main
        className="mx-auto flex w-full max-w-[1020px] flex-1 flex-col gap-5
                   px-[clamp(14px,4vw,28px)] pt-[clamp(22px,5vw,40px)] pb-20"
      >
        <header className="flex flex-col gap-1.5">
          <h1 className="font-serif text-[clamp(28px,5.6vw,38px)] font-normal tracking-[-0.02em] text-espresso">
            The list
          </h1>
          <p className="max-w-[52ch] font-serif text-[18px] font-light leading-normal text-soft">
            New York restaurants we watch, with the exact hour each releases its tables.
            Pick one and we&apos;ll set the alarm.
          </p>
        </header>

        {restaurants.length === 0 ? (
          <p className="rounded-panel border border-dashed border-border bg-card px-[18px] py-[30px] text-center text-[13.5px] text-muted">
            No restaurants yet. Release rules are entered by hand in{" "}
            <code className="font-mono text-xs">prisma/seed/nyc-restaurants.ts</code> and
            loaded with <code className="font-mono text-xs">npm run db:seed</code>.
          </p>
        ) : (
          <RestaurantCatalog restaurants={restaurants} />
        )}
      </main>
    </SiteShell>
  );
}
