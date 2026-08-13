import type { Metadata } from "next";
import { PortalHomeView } from "@/views/portal/portal-home-view";

export const metadata: Metadata = { title: "Dashboard" };

export default function Page() { return <PortalHomeView />; }
