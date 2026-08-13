import type { Metadata } from "next";
import { ManagementView } from "@/views/portal/management-view";

export const metadata: Metadata = { title: "Management" };

export default function Page() {
  return <ManagementView />;
}
