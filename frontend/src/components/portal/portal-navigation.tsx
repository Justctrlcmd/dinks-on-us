"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import { PendingReservationBadge } from "@/components/portal/pending-reservation-badge";
import { managementAreas } from "@/config/management";
import { canAccessPortalModule, getPortalNavigation } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { User } from "@/types/user";

export function PortalNavigation({
  user,
  collapsed = false,
  pendingReservationCount,
  onNavigate,
  onRequestExpand,
}: {
  user: User;
  collapsed?: boolean;
  pendingReservationCount?: number;
  onNavigate?: () => void;
  onRequestExpand?: () => void;
}) {
  const pathname = usePathname();
  const items = getPortalNavigation(user);
  const managementActive = pathname === "/portal/management" || pathname.startsWith("/portal/management/");
  const [managementOpen, setManagementOpen] = useState(managementActive);

  return (
    <nav aria-label="Portal navigation" className="grid gap-1">
      {items.map((item) => {
        const active = item.href === "/portal"
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        const pendingCount = item.module === "RESERVATION" ? pendingReservationCount : undefined;
        const reservationLabel = pendingCount ? `${item.title}, ${pendingCount} pending reservation${pendingCount === 1 ? "" : "s"}` : item.title;

        if (item.module === "MANAGEMENT") {
          const managementButton = (
            <button
              type="button"
              onClick={() => {
                if (collapsed) {
                  onRequestExpand?.();
                  setManagementOpen(true);
                  return;
                }

                setManagementOpen((open) => !open);
              }}
              aria-expanded={!collapsed && managementOpen}
              aria-controls="management-subnavigation"
              className={cn(
                "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                managementActive && "font-medium text-sidebar-foreground",
                collapsed && "justify-center px-0",
              )}
            >
              <Icon aria-hidden="true" className="size-[18px] shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1">{item.title}</span>
                  <FiChevronDown
                    aria-hidden="true"
                    className={cn("size-4 transition-transform", managementOpen && "rotate-180")}
                  />
                </>
              )}
            </button>
          );

          return (
            <div key={item.href}>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger render={managementButton} />
                  <TooltipContent side="right">Open Management</TooltipContent>
                </Tooltip>
              ) : managementButton}

              {!collapsed && managementOpen && (
                <div id="management-subnavigation" className="mt-1 ml-[21px] grid gap-0.5 border-l border-sidebar-border pl-2">
                  {managementAreas.filter((area) => canAccessPortalModule(user, area.module)).map((area) => {
                    const href = `/portal/management/${area.slug}`;
                    const subitemActive = pathname === href;

                    return (
                      <Link
                        key={area.slug}
                        href={href}
                        onClick={onNavigate}
                        aria-current={subitemActive ? "page" : undefined}
                        className={cn(
                          "flex min-h-9 items-center rounded-md px-3 text-[13px] text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                          subitemActive && "bg-sidebar-primary font-medium text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
                        )}
                      >
                        {area.title}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        const link = (
          <Link
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            aria-label={collapsed || pendingCount ? reservationLabel : undefined}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              active && "bg-sidebar-primary font-medium text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground",
              collapsed && "justify-center px-0",
              pendingCount && "relative",
            )}
          >
            <Icon aria-hidden="true" className="size-[18px] shrink-0" />
            {!collapsed && <span>{item.title}</span>}
            {!collapsed && pendingCount ? <PendingReservationBadge count={pendingCount} className="ml-auto" /> : null}
            {collapsed && pendingCount ? <PendingReservationBadge count={pendingCount} icon /> : null}
          </Link>
        );

        return collapsed ? (
          <Tooltip key={item.href}>
            <TooltipTrigger render={link} />
            <TooltipContent side="right">{pendingCount ? `${item.title} · ${pendingCount} pending` : item.title}</TooltipContent>
          </Tooltip>
        ) : <div key={item.href}>{link}</div>;
      })}
    </nav>
  );
}
