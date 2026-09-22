import type { Metadata } from "next";
import { AuthBoundary } from "@/components/portal/auth-boundary";
import { PortalShell } from "@/components/portal/portal-shell";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = noIndexMetadata;

export default function Layout({ children }: { children: React.ReactNode }) { return <AuthBoundary><PortalShell>{children}</PortalShell></AuthBoundary>; }
