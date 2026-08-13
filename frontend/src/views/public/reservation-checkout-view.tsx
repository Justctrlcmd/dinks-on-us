import { PublicSiteFrame } from "@/components/public/public-site-frame";
import { ReservationCheckout } from "@/components/public/reservation/reservation-checkout";

export function ReservationCheckoutView() {
  return (
    <PublicSiteFrame showFooter={false} showMessageButton={false}>
      <main className="min-h-svh bg-background pb-16 pt-24 sm:pt-28">
        <ReservationCheckout />
      </main>
    </PublicSiteFrame>
  );
}
