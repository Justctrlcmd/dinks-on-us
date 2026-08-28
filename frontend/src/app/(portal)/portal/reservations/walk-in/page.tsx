import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { WalkInReservationView } from "@/views/portal/walk-in-reservation-view";

export const metadata: Metadata = { title: { absolute: siteConfig.name } };

export default function Page() {
  return <WalkInReservationView />;
}
