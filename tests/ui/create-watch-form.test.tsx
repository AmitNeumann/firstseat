// @vitest-environment jsdom

/**
 * Basic UI: the create-watch form shows the fields a diner has to fill in.
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CreateWatchForm } from "@/components/watches/create-watch-form";
import type { RestaurantOption } from "@/lib/watches/options";

vi.mock("@/lib/watches/actions", () => ({
  createWatch: vi.fn(),
}));

const restaurants: RestaurantOption[] = [
  {
    id: "3f2504e0-4f89-41d3-9a0c-0305e82c3301",
    name: "Carbone",
    city: "New York",
    rules: [
      {
        platform: "resy",
        daysInAdvance: 30,
        releaseTime: "09:00",
        timezone: "America/New_York",
      },
    ],
  },
];

describe("CreateWatchForm", () => {
  it("shows the restaurant, date, party, meal fields and the submit button", () => {
    render(
      <CreateWatchForm
        restaurants={restaurants}
        earliestDate="2026-09-01"
        latestDate="2026-10-31"
        timezone="Europe/London"
      />,
    );

    expect(screen.getByRole("combobox", { name: "Restaurant" })).toBeInTheDocument();
    expect(screen.getByLabelText("Date you want to eat")).toBeInTheDocument();
    expect(screen.getByLabelText("Party size")).toBeInTheDocument();
    expect(screen.getByLabelText("Meal")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create watch" })).toBeInTheDocument();
  });
});
