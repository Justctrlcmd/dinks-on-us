import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { PortalHomeView } from "@/views/portal/portal-home-view";

export const metadata: Metadata = { title: { absolute: siteConfig.name } };

export default function Page() { return <PortalHomeView />; }
