import { useMutation } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { toast } from "sonner";
import { ToastProvider } from "./toast-provider";
import { NormalizedApiError } from "@/lib/api";
import { QueryProvider } from "@/providers/query-provider";

afterEach(() => {
  toast.dismiss();
  cleanup();
});

function SuccessfulAction() {
  const mutation = useMutation({
    mutationFn: async () => ({
      success: true,
      message: "Appointment marked as completed",
      code: null,
      data: null,
      errors: null,
      meta: null,
    }),
  });

  return <button type="button" onClick={() => mutation.mutate()}>Complete appointment</button>;
}

function FailedActions() {
  const errorMutation = useMutation({
    mutationFn: async () => {
      throw new NormalizedApiError({ status: 422, message: "The submitted details are invalid.", code: "VALIDATION_FAILED" });
    },
  });
  const warningMutation = useMutation({
    mutationFn: async () => {
      throw new NormalizedApiError({ status: 409, message: "This item is already in use.", code: "CONFLICT" });
    },
  });

  return (
    <>
      <button type="button" onClick={() => errorMutation.mutate()}>Submit invalid details</button>
      <button type="button" onClick={() => warningMutation.mutate()}>Submit conflicting change</button>
    </>
  );
}

function ValidationConflictAction() {
  const mutation = useMutation({
    mutationFn: async () => {
      throw new NormalizedApiError({
        status: 422,
        message: "The provided information is invalid.",
        code: "VALIDATION_FAILED",
        errors: { date: ["Active reservations use Sep 14, 2026. Handle those reservations before closing the operation."] },
      });
    },
  });

  return <button type="button" onClick={() => mutation.mutate()}>Close conflicting date</button>;
}

describe("ToastProvider", () => {
  it("shows mutation results through styled Sonner variants", async () => {
    const user = userEvent.setup();
    render(<ToastProvider><QueryProvider><SuccessfulAction /><FailedActions /></QueryProvider></ToastProvider>);

    await user.click(screen.getByRole("button", { name: "Complete appointment" }));
    await user.click(screen.getByRole("button", { name: "Submit invalid details" }));
    await user.click(screen.getByRole("button", { name: "Submit conflicting change" }));

    const successToast = (await screen.findByText("Appointment marked as completed")).closest("[data-sonner-toast]");
    const errorToast = (await screen.findByText("The submitted details are invalid.")).closest("[data-sonner-toast]");
    const warningToast = (await screen.findByText("This item is already in use.")).closest("[data-sonner-toast]");

    expect(successToast).toHaveAttribute("data-type", "success");
    expect(successToast).toHaveClass("min-h-12", "w-full", "rounded-lg", "border-l-success", "px-3", "py-3");
    expect(errorToast).toHaveAttribute("data-type", "error");
    expect(errorToast).toHaveClass("border-l-destructive");
    expect(warningToast).toHaveAttribute("data-type", "warning");
    expect(warningToast).toHaveClass("border-l-amber-600");
    expect(successToast?.closest("[data-sonner-toaster]"))
      .toHaveAttribute("data-y-position", "bottom");
    expect(successToast?.closest("[data-sonner-toaster]"))
      .toHaveAttribute("data-x-position", "right");
  });

  it("uses the field-specific API message for validation conflicts", async () => {
    const user = userEvent.setup();
    render(<ToastProvider><QueryProvider><ValidationConflictAction /></QueryProvider></ToastProvider>);

    await user.click(screen.getByRole("button", { name: "Close conflicting date" }));

    expect(await screen.findByText("Active reservations use Sep 14, 2026. Handle those reservations before closing the operation.")).toBeInTheDocument();
    expect(screen.queryByText("The provided information is invalid.")).not.toBeInTheDocument();
  });
});
