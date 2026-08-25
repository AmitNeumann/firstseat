"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * A one-second clock that does not use `setState` inside an effect — the React Compiler
 * forbids that pattern. `useSyncExternalStore` is the supported way to subscribe to the
 * browser clock.
 *
 * Snapshot is the current second (not `Date.now()` itself) so React can tell that nothing
 * changed between renders inside the same second. `serverNow` is the Server Component's
 * clock, used during SSR and hydration so the first paint is not "20000 days remaining".
 */
export function useTickingNow(enabled: boolean, serverNow = 0): number {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!enabled) {
        return () => {};
      }

      const id = window.setInterval(onChange, 1000);
      return () => window.clearInterval(id);
    },
    [enabled],
  );

  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 1000) * 1000,
    () => serverNow,
  );
}
