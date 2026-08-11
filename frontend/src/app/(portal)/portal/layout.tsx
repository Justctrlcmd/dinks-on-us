import { AuthBoundary } from "@/components/portal/auth-boundary";
import { PortalShell } from "@/components/portal/portal-shell";
export default function Layout({ children }: { children: React.ReactNode }) { return <AuthBoundary><PortalShell>{children}</PortalShell></AuthBoundary>; }
