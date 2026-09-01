// @vitest-environment jsdom

/**
 * Basic UI: Settings' delete control asks for confirmation before submitting.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DeleteAccount } from "@/components/settings/delete-account";

vi.mock("@/lib/auth/actions", () => ({
  deleteAccount: vi.fn(),
}));

describe("DeleteAccount", () => {
  it("opens a confirmation dialog when Delete your account is clicked", async () => {
    const user = userEvent.setup();

    render(<DeleteAccount />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete your account" }));

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAccessibleName("Are you sure?");
    expect(
      screen.getByText(/permanently deletes your account and all your watches/),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm" })).toBeInTheDocument();
  });
});
