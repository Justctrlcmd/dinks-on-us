import type { Metadata } from "next";
import { ReserveView } from "@/views/public/reserve-view";
import { publicMetadata } from "@/lib/seo";

export const metadata: Metadata = publicMetadata({
  title: "Reserve a Pickleball Court",
  description: "Check court availability and reserve your Dinks on Us pickleball court in Angat, Bulacan.",
  path: "/reserve",
});

export default function Page() {
  return <ReserveView />;
}
