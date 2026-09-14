import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { ActionLogsManagementView } from "@/views/portal/action-logs-management-view";

export const metadata: Metadata = { title: { absolute: siteConfig.name } };

export default function Page() {
  return <ActionLogsManagementView />;
}
