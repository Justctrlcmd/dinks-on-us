import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { ReservationsView } from "@/views/portal/reservations-view";

export const metadata: Metadata = { title: { absolute: siteConfig.name } };

export default function Page() {
  return <ReservationsView />;
}
