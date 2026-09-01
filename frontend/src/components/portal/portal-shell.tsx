"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { FiChevronLeft, FiClock, FiMenu } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PendingReservationBadge } from "@/components/portal/pending-reservation-badge";
import { canAccessPortalModule } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { useCurrentUser } from "@/hooks/queries/use-current-user";
import { usePendingReservationCount } from "@/hooks/queries/use-reservations";
import { cn } from "@/lib/utils";
import { PortalNavigation } from "./portal-navigation";
import { PortalUserMenu } from "./portal-user-menu";
import { PortalAccessBoundary } from "./portal-access-boundary";

export function PortalShell({ children }: { children: React.ReactNode }) {
  const { data: user } = useCurrentUser();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pendingReservationQuery = usePendingReservationCount(Boolean(user && canAccessPortalModule(user, "RESERVATION")));

  if (!user) return null;

  const pendingReservationCount = pendingReservationQuery.data?.pending_count;

  return (
    <div className="min-h-svh bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden border-r border-sidebar-border bg-sidebar p-3 text-sidebar-foreground transition-[width] duration-200 motion-reduce:transition-none md:flex md:flex-col",
          collapsed ? "w-[72px]" : "w-64",
        )}
      >
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={() => setCollapsed(false)}
                  className="mx-auto grid size-11 place-items-center rounded-xl transition-colors hover:bg-sidebar-accent focus-visible:outline-sidebar-ring"
                  aria-label="Expand sidebar"
                >
                  <Image
                    src="/images/dinks-on-us-logo.png"
                    alt=""
                    width={36}
                    height={36}
                    className="size-9 rounded-lg object-contain"
                    priority
                  />
                </button>
              }
            />
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        ) : (
          <div className="flex h-11 items-center justify-between gap-2 pl-1">
            <Link href="/portal" className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-sidebar-ring">
              <Image
                src="/images/dinks-on-us-logo.png"
                alt=""
                width={36}
                height={36}
                className="size-9 shrink-0 rounded-lg object-contain"
                priority
              />
              <span className="truncate font-heading font-semibold">{siteConfig.name}</span>
            </Link>
            <Button
              size="icon-sm"
              variant="ghost"
              className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
            >
              <FiChevronLeft aria-hidden="true" />
            </Button>
          </div>
        )}

        <Separator className="my-3 bg-sidebar-border" />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <PortalNavigation
            user={user}
            collapsed={collapsed}
            pendingReservationCount={pendingReservationCount}
            onRequestExpand={() => setCollapsed(false)}
          />
        </div>
        <div className="mt-3 border-t border-sidebar-border pt-3">
          <PortalUserMenu user={user} collapsed={collapsed} />
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Open navigation"><FiMenu aria-hidden="true" /></Button>} />
          <SheetContent side="left" className="w-72 bg-sidebar text-sidebar-foreground">
            <SheetHeader className="border-b border-sidebar-border">
              <SheetTitle className="flex items-center gap-2.5 text-sidebar-foreground">
                <Image src="/images/dinks-on-us-logo.png" alt="" width={36} height={36} className="size-9 rounded-lg object-contain" />
                {siteConfig.name}
              </SheetTitle>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto px-3">
              <PortalNavigation user={user} pendingReservationCount={pendingReservationCount} onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="mt-auto border-t border-sidebar-border p-3">
              <PortalUserMenu user={user} />
            </div>
          </SheetContent>
        </Sheet>
        <Link href="/portal" className="flex items-center gap-2 font-heading font-semibold">
          <Image src="/images/dinks-on-us-logo.png" alt="" width={30} height={30} className="size-7 rounded-md object-contain" />
          {siteConfig.name}
        </Link>
        <div className="flex items-center gap-1">
          {pendingReservationCount ? (
            <Link href="/portal/reservations" aria-label={`${pendingReservationCount} pending reservation${pendingReservationCount === 1 ? "" : "s"}`} className="relative grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-ring">
              <FiClock aria-hidden="true" className="size-[18px]" />
              <PendingReservationBadge count={pendingReservationCount} icon className="border-background" />
            </Link>
          ) : null}
          <ThemeToggle />
        </div>
      </header>

      <main className={cn("transition-[padding] duration-200 motion-reduce:transition-none", collapsed ? "md:pl-[72px]" : "md:pl-64")}>
        <div className="mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-8">
          <PortalAccessBoundary user={user}>{children}</PortalAccessBoundary>
        </div>
      </main>
    </div>
  );
}
