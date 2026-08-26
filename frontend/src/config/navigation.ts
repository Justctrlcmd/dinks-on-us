import { icons } from "@/config/icons";
import { getManagementArea } from "@/config/management";
import type { PortalModule, User } from "@/types/user";

export const portalNavigation = [
  { title: "Dashboard", href: "/portal", icon: icons.dashboard, module: "DASHBOARD" },
  { title: "Reservations", href: "/portal/reservations", icon: icons.reservations, module: "RESERVATION" },
  { title: "History", href: "/portal/history", icon: icons.history, module: "HISTORY" },
  { title: "Management", href: "/portal/management", icon: icons.management, module: "MANAGEMENT" },
  { title: "Reports", href: "/portal/reports", icon: icons.reports, module: "REPORTS" },
] as const;

export function canAccessPortalModule(user: User, module: PortalModule) {
  if (user.role?.is_full_access === true) return true;
  if (module === "MANAGEMENT") return user.modules?.some((assigned) => assigned.startsWith("MANAGEMENT_")) === true;
  if (module === "SETTINGS") return false;
  return user.modules?.includes(module) === true;
}

export function getPortalNavigation(user: User) {
  return portalNavigation.filter((item) => canAccessPortalModule(user, item.module));
}

export function getRequiredPortalModule(pathname: string): PortalModule | null {
  if (pathname === "/portal/profile") return null;

  if (pathname.startsWith("/portal/management/")) {
    const slug = pathname.split("/")[3];
    const area = getManagementArea(slug);
    if (area) return area.module;
  }

  const item = [...portalNavigation]
    .sort((left, right) => right.href.length - left.href.length)
    .find(({ href }) => pathname === href || (href !== "/portal" && pathname.startsWith(`${href}/`)));

  return item?.module ?? (pathname === "/portal" ? "DASHBOARD" : null);
}
