import { describe, expect, it } from "vitest";
import {
  canAccessPortalModule,
  getPortalNavigation,
  getRequiredPortalModule,
} from "@/config/navigation";
import type { User } from "@/types/user";

const baseUser: User = {
  id: 1,
  name: "Front Desk",
  email: "frontdesk@example.com",
  contact_number: "09123456789",
  is_active: true,
  last_login_at: null,
  role: {
    id: 2,
    name: "Front Desk",
    slug: "front-desk",
    is_full_access: false,
  },
  modules: ["DASHBOARD", "RESERVATION", "HISTORY", "ACTION_LOGS"],
  email_verified_at: null,
  created_at: "2026-08-13T00:00:00Z",
  updated_at: "2026-08-13T00:00:00Z",
};

describe("portal navigation authorization", () => {
  it("shows only the modules assigned to a staff role", () => {
    expect(getPortalNavigation(baseUser).map(({ title }) => title)).toEqual([
      "Dashboard",
      "Reservations",
      "History",
      "Action Logs",
    ]);
  });

  it("gives a full-access manager every operational navigation module", () => {
    const manager: User = {
      ...baseUser,
      role: { ...baseUser.role!, name: "Manager", slug: "manager", is_full_access: true },
      modules: [],
    };

    expect(getPortalNavigation(manager)).toHaveLength(6);
    expect(canAccessPortalModule(manager, "SETTINGS")).toBe(true);
  });

  it("maps nested routes to their parent authorization module", () => {
    expect(getRequiredPortalModule("/portal/management/court-pricing")).toBe("MANAGEMENT_COURT_PRICING");
    expect(getRequiredPortalModule("/portal/management/staff-accounts")).toBe("MANAGEMENT_TEAM_ACCESS");
    expect(getRequiredPortalModule("/portal/reservations/DOU-0012")).toBe("RESERVATION");
    expect(getRequiredPortalModule("/portal/action-logs")).toBe("ACTION_LOGS");
    expect(getRequiredPortalModule("/portal/profile")).toBeNull();
    expect(getRequiredPortalModule("/portal/settings")).toBeNull();
  });
});
