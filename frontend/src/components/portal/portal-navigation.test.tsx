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
  contact_number: null,
  is_active: true,
  last_login_at: null,
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

    expect(screen.queryByRole("link", { name: "Courts & Pricing" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Management" }));

    expect(screen.queryByRole("link", { name: "Overview" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Courts & Pricing" })).toHaveAttribute("href", "/portal/management/court-pricing");
    expect(screen.getByRole("link", { name: "Availability & Closures" })).toHaveAttribute("href", "/portal/management/close-date-slot");
    expect(screen.getByRole("link", { name: "Payment Methods" })).toHaveAttribute("href", "/portal/management/payment-method");
    expect(screen.getByRole("link", { name: "Team & Access" })).toHaveAttribute("href", "/portal/management/staff-accounts");
    expect(screen.getByRole("link", { name: "Rules & Policies" })).toHaveAttribute("href", "/portal/management/rules-policy");
    expect(screen.getByRole("link", { name: "Events" })).toHaveAttribute("href", "/portal/management/events");
    expect(screen.getByRole("link", { name: "FAQs" })).toHaveAttribute("href", "/portal/management/faqs");
    expect(screen.getByRole("link", { name: "Gallery" })).toHaveAttribute("href", "/portal/management/gallery");
  });
});
