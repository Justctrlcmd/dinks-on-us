import type { Metadata } from "next";
import { ReservationCheckoutView } from "@/views/public/reservation-checkout-view";
import { noIndexMetadata } from "@/lib/seo";

export const metadata: Metadata = noIndexMetadata;

export default function Page() {
  return <ReservationCheckoutView />;
}
