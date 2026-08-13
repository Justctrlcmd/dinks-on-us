"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FiLogOut, FiMoreHorizontal, FiSettings, FiUser } from "react-icons/fi";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLogout } from "@/hooks/mutations/use-auth-mutations";
import type { User } from "@/types/user";
export function PortalUserMenu({ user, collapsed = false }: { user: User; collapsed?: boolean }) {
  const router = useRouter(); const logout = useLogout(); const initials = user.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  const trigger = <button type="button" className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-sidebar-accent" aria-label="Open account menu"><Avatar size="sm"><AvatarFallback>{initials}</AvatarFallback></Avatar>{!collapsed && <><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{user.name}</span><span className="block truncate text-xs text-sidebar-foreground/65">{user.role?.name ?? user.email}</span></span><FiMoreHorizontal aria-hidden="true" /></>}</button>;
  return <DropdownMenu><DropdownMenuTrigger render={trigger} /><DropdownMenuContent side="top" align="start" className="min-w-56"><DropdownMenuItem render={<Link href="/portal/profile" />}><FiUser aria-hidden="true" />Profile</DropdownMenuItem><DropdownMenuItem render={<Link href="/portal/settings" />}><FiSettings aria-hidden="true" />Settings</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem variant="destructive" disabled={logout.isPending} onClick={async () => { await logout.mutateAsync(); router.replace("/login"); }}><FiLogOut aria-hidden="true" />Logout</DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
}
