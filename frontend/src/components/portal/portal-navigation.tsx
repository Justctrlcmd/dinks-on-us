"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { portalNavigation } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
export function PortalNavigation({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  return <nav aria-label="Portal navigation" className="grid gap-1">{portalNavigation.map((item) => { const active = pathname === item.href; const Icon = item.icon; const link = <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn("flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors hover:bg-sidebar-accent", active && "bg-sidebar-accent font-medium", collapsed && "justify-center px-0")}><Icon aria-hidden="true" className="size-4 shrink-0" />{!collapsed && <span>{item.title}</span>}</Link>; return collapsed ? <Tooltip key={item.href}><TooltipTrigger render={link} /><TooltipContent side="right">{item.title}</TooltipContent></Tooltip> : <div key={item.href}>{link}</div>; })}</nav>;
}
