import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

const mutateAsync = vi.hoisted(() => vi.fn());
vi.mock("@/hooks/mutations/use-court-pricing-mutations", () => ({
  useUpdateCourtConfiguration: () => ({ mutateAsync, isPending: false }),
}));

import { CourtConfigurationFormDialog } from "./court-configuration-form-dialog";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it("guides staff to add both missing price periods before saving a new configuration", async () => {
  const user = userEvent.setup();
  render(<CourtConfigurationFormDialog configuration={null} open onOpenChange={vi.fn()} />);
  await user.click(screen.getByRole("button", { name: "Save configuration" }));
  expect(await screen.findByText("Add at least one weekday price period.")).toBeInTheDocument();
  expect(screen.getByText("Add at least one weekend price period.")).toBeInTheDocument();
  expect(screen.queryByText(/Too small|expected array/)).not.toBeInTheDocument();
  expect(mutateAsync).not.toHaveBeenCalled();
});
