import type { Metadata } from "next";
import { WalkInReservationView } from "@/views/portal/walk-in-reservation-view";

export const metadata: Metadata = { title: "Add Walk-in" };

export default function Page() {
  return <WalkInReservationView />;
}
