// @vitest-environment jsdom

/**
 * Basic UI: the password field's eye toggle switches the input between hidden and shown.
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { PasswordField } from "@/components/auth/form-fields";

describe("PasswordField", () => {
  it("toggles the input between password and text when the eye is clicked", async () => {
    const user = userEvent.setup();

    render(
      <PasswordField
        label="Password"
        name="password"
        autoComplete="current-password"
      />,
    );

    const input = screen.getByLabelText("Password");
    expect(input).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(input).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(input).toHaveAttribute("type", "password");
  });
});
