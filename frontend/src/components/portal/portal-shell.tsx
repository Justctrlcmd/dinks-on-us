"use client";

import { useState } from "react";
import { FiChevronLeft, FiChevronRight, FiMenu } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { siteConfig } from "@/config/site";
import { useCurrentUser } from "@/hooks/queries/use-current-user";
import { cn } from "@/lib/utils";
import { PortalNavigation } from "./portal-navigation";
import { PortalUserMenu } from "./portal-user-menu";

export function PortalShell({ children }: { children: React.ReactNode }) {
  const { data: user } = useCurrentUser(); const [collapsed, setCollapsed] = useState(false); const [mobileOpen, setMobileOpen] = useState(false);
  const toggle = () => setCollapsed((value) => !value);
  if (!user) return null;
  return <div className="min-h-svh bg-background">
    <aside className={cn("fixed inset-y-0 left-0 z-30 hidden border-r bg-sidebar p-3 transition-[width] duration-200 md:flex md:flex-col", collapsed ? "w-16" : "w-64")}>
      <div className={cn("flex h-10 items-center gap-2", collapsed ? "justify-center" : "justify-between px-2")}><span className="font-semibold">{collapsed ? "D" : siteConfig.name}</span><Button size="icon-sm" variant="ghost" onClick={toggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>{collapsed ? <FiChevronRight aria-hidden="true" /> : <FiChevronLeft aria-hidden="true" />}</Button></div>
      <Separator className="my-3" /><PortalNavigation collapsed={collapsed} /><div className="mt-auto"><PortalUserMenu user={user} collapsed={collapsed} /></div>
    </aside>
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/90 px-4 backdrop-blur md:hidden"><Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Open navigation"><FiMenu aria-hidden="true" /></Button>} /><SheetContent side="left" className="w-72"><SheetHeader><SheetTitle>{siteConfig.name}</SheetTitle></SheetHeader><div className="px-3"><PortalNavigation onNavigate={() => setMobileOpen(false)} /></div><div className="mt-auto border-t p-3"><PortalUserMenu user={user} /></div></SheetContent></Sheet><span className="font-semibold">{siteConfig.name}</span><ThemeToggle /></header>
    <main className={cn("transition-[padding] duration-200", collapsed ? "md:pl-16" : "md:pl-64")}><div className="mx-auto max-w-6xl p-4 sm:p-6 lg:p-8">{children}</div></main>
  </div>;
}
