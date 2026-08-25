import Link from "next/link";

import { RestaurantPhoto } from "@/components/restaurants/restaurant-photo";
import {
  describeReleaseSchedule,
  restaurantLabel,
  watchCreationPath,
  type RestaurantOption,
} from "@/lib/watches/options";
import { platformLabel } from "@/lib/watches/platforms";

/**
 * One room on the catalog grid.
 *
 * The whole card is the link: picking a restaurant is starting a watch for it. "Watch
 * this" is visual, not a second control, so a keyboard user tabs once per card.
 */
export function RestaurantCard({ restaurant }: { restaurant: RestaurantOption }) {
  const platforms = [...new Set(restaurant.rules.map((rule) => platformLabel(rule.platform)))];

  return (
    <Link
      href={watchCreationPath(restaurant.id)}
      aria-label={`Watch ${restaurantLabel(restaurant)}`}
      className="group flex flex-col overflow-hidden rounded-[18px] border border-border bg-card
                 shadow-card transition-[border-color] duration-150 hover:border-honey-border"
    >
      <RestaurantPhoto imageUrl={restaurant.imageUrl ?? null} />

      <div className="flex flex-1 flex-col gap-[7px] px-[18px] pt-4 pb-[18px]">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-serif text-[22px] font-medium tracking-[-0.015em] text-espresso">
            {restaurant.name}
          </h2>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            {platforms.join(" · ")}
          </p>
        </div>

        <p className="text-[13px] text-muted">{restaurant.city}</p>

        <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-border pt-3.5">
          <p className="text-[12.5px] text-muted">{describeReleaseSchedule(restaurant.rules)}</p>
          <span
            className="rounded-lg bg-honey px-3 py-[7px] text-[13px] font-semibold
                       text-clay-text group-hover:bg-apricot group-hover:text-[#5A2D18]"
          >
            Watch this
          </span>
        </div>
      </div>
    </Link>
  );
}
