import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CurrentPasswordConfirmationDialog } from "./current-password-confirmation-dialog";

afterEach(cleanup);

describe("CurrentPasswordConfirmationDialog", () => {
  it("submits the password only from the confirmation step", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    render(
      <CurrentPasswordConfirmationDialog
        open
        onOpenChange={vi.fn()}
        title="Confirm action"
        description="Enter your current password."
        confirmLabel="Confirm"
        pending={false}
        onConfirm={onConfirm}
      />,
    );

    await user.type(screen.getByLabelText(/^Your current password/), "password123");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith("password123"));
  });

  it("clears a rejected password so it can be entered again", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn().mockRejectedValue(new Error("Rejected"));

    render(
      <CurrentPasswordConfirmationDialog
        open
        onOpenChange={vi.fn()}
        title="Confirm action"
        description="Enter your current password."
        confirmLabel="Confirm"
        pending={false}
        onConfirm={onConfirm}
      />,
    );

    const password = screen.getByLabelText(/^Your current password/);
    await user.type(password, "wrong-password");
    await user.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(password).toHaveValue(""));
  });
});
