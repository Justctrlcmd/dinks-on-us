import { icons } from "@/config/icons";
import type { PortalModule, User } from "@/types/user";

export const portalNavigation = [
  { title: "Dashboard", href: "/portal", icon: icons.dashboard, module: "DASHBOARD" },
  { title: "Reservations", href: "/portal/reservations", icon: icons.reservations, module: "RESERVATION" },
  { title: "History", href: "/portal/history", icon: icons.history, module: "HISTORY" },
  { title: "Management", href: "/portal/management", icon: icons.management, module: "MANAGEMENT" },
  { title: "Reports", href: "/portal/reports", icon: icons.reports, module: "REPORTS" },
] as const;

export function canAccessPortalModule(user: User, module: PortalModule) {
  return user.role?.is_full_access === true || user.modules?.includes(module) === true;
}

export function getPortalNavigation(user: User) {
  return portalNavigation.filter((item) => canAccessPortalModule(user, item.module));
}

export function getRequiredPortalModule(pathname: string): PortalModule | null {
  if (pathname === "/portal/profile") return null;

  const item = [...portalNavigation]
    .sort((left, right) => right.href.length - left.href.length)
    .find(({ href }) => pathname === href || (href !== "/portal" && pathname.startsWith(`${href}/`)));

  return item?.module ?? (pathname === "/portal" ? "DASHBOARD" : null);
}
