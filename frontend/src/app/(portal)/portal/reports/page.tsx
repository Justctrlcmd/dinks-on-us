import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { ReportsView } from "@/views/portal/reports-view";

export const metadata: Metadata = { title: { absolute: siteConfig.name } };

export default function Page() {
  return <ReportsView />;
}
