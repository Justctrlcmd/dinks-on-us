import type { Metadata } from "next";
import { HistoryView } from "@/views/portal/history-view";

export const metadata: Metadata = { title: "History" };

export default function Page() {
  return <HistoryView />;
}
