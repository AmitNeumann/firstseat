"use client";

import { useState } from "react";

/**
 * Catalog card image: a real photo when `imageUrl` is set and loads, otherwise the
 * striped "room photo" placeholder from the design.
 *
 * `onError` covers a path in the seed whose file is not in `public/` yet.
 */
export function RestaurantPhoto({ imageUrl }: { imageUrl: string | null }) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return <PhotoPlaceholder />;
  }

  return (
    // Decorative: the card link already names the restaurant.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imageUrl}
      alt=""
      onError={() => setFailed(true)}
      className="h-[112px] w-full object-cover"
    />
  );
}

function PhotoPlaceholder() {
  return (
    <div
      className="flex h-[112px] items-center justify-center text-[10.5px] font-semibold
                 uppercase tracking-[0.16em] text-tan"
      style={{
        background:
          "repeating-linear-gradient(135deg, var(--honey) 0 9px, #EEDBB6 9px 18px)",
      }}
      aria-hidden="true"
    >
      room photo
    </div>
  );
}
