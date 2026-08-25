import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Reschedule Policy" };

export default function Page() {
  redirect("/policies/reschedule-policy");
}
