import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PortalAccessBoundary } from "./portal-access-boundary";
import type { User } from "@/types/user";

vi.mock("next/navigation", () => ({ usePathname: () => "/portal/profile" }));

const user = {
  id: 1,
  role: { id: 2, name: "Team", slug: "team", is_full_access: false },
  modules: ["MANAGEMENT_TEAM_ACCESS"],
} as User;

describe("profile access", () => {
  it("blocks a direct profile visit even with Team & Access permission", () => {
    render(<PortalAccessBoundary user={user}><div>Profile forms</div></PortalAccessBoundary>);
    expect(screen.queryByText("Profile forms")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Your account details are managed by your Manager.");
  });

  it("keeps the profile available to a full-access manager", () => {
    render(<PortalAccessBoundary user={{ ...user, role: { ...user.role!, is_full_access: true } }}><div>Profile forms</div></PortalAccessBoundary>);
    expect(screen.getByText("Profile forms")).toBeInTheDocument();
  });
});
