import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Cancellation Policy" };

export default function Page() {
  redirect("/policies/cancellation-policy");
}
