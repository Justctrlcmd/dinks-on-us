import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { User } from "@/types/user";
import { PortalNavigation } from "./portal-navigation";

vi.mock("next/navigation", () => ({ usePathname: () => "/portal" }));

const manager: User = {
  id: 1,
  name: "Manager",
  email: "manager@example.com",
  role: {
    id: 1,
    name: "Manager",
    slug: "manager",
    is_full_access: true,
  },
  modules: [],
  email_verified_at: "2026-08-13T00:00:00Z",
  created_at: "2026-08-13T00:00:00Z",
  updated_at: "2026-08-13T00:00:00Z",
};

describe("PortalNavigation", () => {
  it("reveals dedicated management links when Management is clicked", async () => {
    const user = userEvent.setup();
    render(<PortalNavigation user={manager} />);

    expect(screen.queryByRole("link", { name: "Rates & Pricing" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Management" }));

    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("href", "/portal/management");
    expect(screen.getByRole("link", { name: "Rates & Pricing" })).toHaveAttribute("href", "/portal/management/rates");
    expect(screen.getByRole("link", { name: "Website Settings" })).toHaveAttribute("href", "/portal/management/site-settings");
  });
});
