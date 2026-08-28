import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { HistoryView } from "@/views/portal/history-view";

export const metadata: Metadata = { title: { absolute: siteConfig.name } };

export default function Page() {
  return <HistoryView />;
}
