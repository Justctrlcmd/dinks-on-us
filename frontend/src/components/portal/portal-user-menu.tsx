"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { FiLogOut, FiMoon, FiMoreHorizontal, FiSun, FiUser } from "react-icons/fi";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useLogout } from "@/hooks/mutations/use-auth-mutations";
import { canAccessPortalModule } from "@/config/navigation";
import { PushNotificationSettings } from "@/components/portal/push-notification-settings";
import type { User } from "@/types/user";

const subscribe = () => () => undefined;

export function PortalUserMenu({ user, collapsed = false }: { user: User; collapsed?: boolean }) {
  const router = useRouter(); const logout = useLogout(); const { resolvedTheme, setTheme } = useTheme(); const mounted = useSyncExternalStore(subscribe, () => true, () => false); const darkMode = mounted && resolvedTheme === "dark"; const initials = user.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join("").toUpperCase();
  const trigger = <button type="button" className="flex w-full items-center gap-3 rounded-lg p-2 text-left hover:bg-sidebar-accent" aria-label="Open account menu"><Avatar size="sm"><AvatarFallback>{initials}</AvatarFallback></Avatar>{!collapsed && <><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{user.name}</span><span className="block truncate text-xs text-sidebar-foreground/65">{user.role?.name ?? user.email}</span></span><FiMoreHorizontal aria-hidden="true" /></>}</button>;
  return <DropdownMenu><DropdownMenuTrigger render={trigger} /><DropdownMenuContent side="top" align="start" className="min-w-56"><DropdownMenuItem render={<Link href="/portal/profile" />}><FiUser aria-hidden="true" />Profile</DropdownMenuItem><DropdownMenuItem disabled={!mounted} onClick={() => setTheme(darkMode ? "light" : "dark")}>{darkMode ? <FiSun aria-hidden="true" /> : <FiMoon aria-hidden="true" />}{darkMode ? "Light Mode" : "Dark Mode"}</DropdownMenuItem>{canAccessPortalModule(user, "RESERVATION") ? <PushNotificationSettings /> : null}<DropdownMenuSeparator /><DropdownMenuItem variant="destructive" disabled={logout.isPending} onClick={async () => { await logout.mutateAsync(); router.replace("/login"); }}><FiLogOut aria-hidden="true" /><span>Logout</span></DropdownMenuItem></DropdownMenuContent></DropdownMenu>;
}
