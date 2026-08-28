import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { ManagementView } from "@/views/portal/management-view";

export const metadata: Metadata = { title: { absolute: siteConfig.name } };

export default function Page() {
  return <ManagementView />;
}
