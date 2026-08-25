import Link from "next/link";

import {
  describeReleaseSchedule,
  restaurantLabel,
  watchCreationPath,
  type RestaurantOption,
} from "@/lib/watches/options";
import { platformLabel } from "@/lib/watches/platforms";

/**
 * One room on the catalog grid — typographic card, no photo.
 *
 * The whole card is the link: picking a restaurant is starting a watch for it. "Watch
 * this" is visual, not a second control, so a keyboard user tabs once per card.
 *
 * City is shown as the "NEW YORK" eyebrow. We do not invent neighborhoods; the schema
 * only has city.
 */
export function RestaurantCard({ restaurant }: { restaurant: RestaurantOption }) {
  const platforms = [...new Set(restaurant.rules.map((rule) => rule.platform))];

  return (
    <Link
      href={watchCreationPath(restaurant.id)}
      aria-label={`Watch ${restaurantLabel(restaurant)}`}
      className="group flex flex-col gap-2.5 rounded-[18px] border border-border bg-card
                 px-5 py-[18px] transition-[background-color,border-color,box-shadow] duration-150
                 hover:border-[#E3D6BC] hover:bg-[#FFFDF8]
                 hover:shadow-[0_20px_40px_-26px_rgba(90,45,24,0.45)]"
    >
      <div className="flex items-center justify-between gap-2.5 border-b border-border pb-[9px]">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">
          {restaurant.city}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-clay">
          {platforms.map(platformLabel).join(" · ")}
        </span>
      </div>

      <h2 className="font-serif text-[29px] font-light leading-[1.06] tracking-[-0.022em] text-espresso">
        {restaurant.name}
      </h2>

      <div className="mt-auto flex flex-col gap-3 border-t border-border pt-3">
        <p className="font-serif text-base font-normal leading-snug text-[#3A322C]">
          {describeReleaseSchedule(restaurant.rules)}
        </p>
        <span
          className="self-start rounded-[10px] bg-clay px-4 py-2.5 text-[13px] font-semibold
                     text-cream-on-clay group-hover:bg-clay-dark"
        >
          Watch this
        </span>
      </div>
    </Link>
  );
}
