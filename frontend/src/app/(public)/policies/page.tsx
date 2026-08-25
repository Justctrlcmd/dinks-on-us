import type { Metadata } from "next";
import { PoliciesView } from "@/views/public/policies-view";

export const metadata: Metadata = { title: "Rules & Policies" };

export default function Page() {
  return <PoliciesView />;
}
