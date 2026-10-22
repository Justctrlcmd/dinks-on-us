import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PolicySection } from "@/types/policy";

const { usePolicies, refetch } = vi.hoisted(() => ({ usePolicies: vi.fn(), refetch: vi.fn() }));
vi.mock("@/hooks/queries/use-policies", () => ({ useManagementPolicies: usePolicies }));
vi.mock("@/hooks/mutations/use-policy-mutations", () => ({
  useDeletePolicyRule: () => ({ isPending: false }),
  useDeletePolicySubheader: () => ({ isPending: false }),
  useUpdatePolicyRuleOrder: () => ({ isPending: false }),
  useUpdatePolicySubheaderOrder: () => ({ isPending: false }),
}));

import { PolicyManagementView } from "./policy-management-view";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("policy management", () => {
  it("shows a useful message and retry when the policy sections are missing", async () => {
    const user = userEvent.setup();
    usePolicies.mockReturnValue({ data: [], isPending: false, isError: false, refetch });
    render(<PolicyManagementView />);
    expect(screen.getByRole("heading", { name: "Policy sections are unavailable." })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("renders restored empty policy boards with controls for adding content", () => {
    const data: PolicySection[] = [
      { slug: "court-rules", name: "Court Rules & Policy" },
      { slug: "reservation-rules", name: "Reservation Rules & Policy" },
      { slug: "reschedule-policy", name: "Reschedule Policy" },
      { slug: "cancellation-policy", name: "Cancellation Policy" },
    ].map((section, index) => ({ ...section, id: index + 1, sort_order: index + 1, subheaders: [], created_at: "", updated_at: "" })) as PolicySection[];
    usePolicies.mockReturnValue({ data, isPending: false, isError: false, refetch });
    render(<PolicyManagementView />);
    for (const section of data) expect(screen.getByRole("heading", { name: section.name })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Add sub-header/ })).toHaveLength(4);
    expect(screen.getAllByText("No sub-headers yet.")).toHaveLength(4);
  });
});
