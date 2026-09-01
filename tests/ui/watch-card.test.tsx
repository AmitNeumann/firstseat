// @vitest-environment jsdom

/**
 * Basic UI: a watch card shows the restaurant and countdown, and Delete asks first.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WatchCard, type DashboardWatch } from "@/components/watches/watch-card";
import { formatCountdown } from "@/lib/watches/format";

vi.mock("next/link", () => ({
  default({ href, children }: { href: string; children: React.ReactNode }) {
    return <a href={href}>{children}</a>;
  },
}));

vi.mock("@/lib/watches/actions", () => ({
  cancelWatch: vi.fn(),
}));

const NOW = Date.parse("2026-09-01T12:00:00.000Z");
const NINETY_MINUTES_MS = 90 * 60 * 1000;

function sampleWatch(overrides: Partial<DashboardWatch> = {}): DashboardWatch {
  return {
    id: "watch-1",
    name: "Carbone",
    targetDate: "2026-09-24",
    meal: "DINNER",
    partySize: 2,
    alerts: [
      {
        id: "alert-1",
        platform: "resy",
        dropDatetime: new Date(NOW + NINETY_MINUTES_MS).toISOString(),
        alertAt: new Date(NOW + NINETY_MINUTES_MS - 5 * 60 * 1000).toISOString(),
        bookingUrl: "https://resy.com/cities/ny/carbone",
        restaurantZone: "America/New_York",
      },
    ],
    ...overrides,
  };
}

describe("WatchCard", () => {
  it("renders the restaurant name and the countdown to the drop", () => {
    render(
      <WatchCard watch={sampleWatch()} timezone="Europe/London" now={NOW} />,
    );

    expect(screen.getByRole("heading", { name: "Carbone" })).toBeInTheDocument();
    expect(screen.getByText(formatCountdown(NINETY_MINUTES_MS))).toBeInTheDocument();
    expect(screen.getByText(/Dinner · Party of 2/)).toBeInTheDocument();
  });

  it("opens a confirmation dialog when Delete is clicked", async () => {
    const user = userEvent.setup();

    render(
      <WatchCard watch={sampleWatch()} timezone="Europe/London" now={NOW} />,
    );

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAccessibleName("Are you sure you want to delete this watch?");
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });
});
