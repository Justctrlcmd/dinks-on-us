import { PublicSiteFrame } from "@/components/public/public-site-frame";
import { ReservationExperience } from "@/components/public/reservation/reservation-experience";

export function ReserveView() {
  return (
    <PublicSiteFrame showFooter={false} showMessageButton={false}>
      <main className="min-h-svh bg-background pt-28 sm:pt-32">
        <ReservationExperience />
      </main>
    </PublicSiteFrame>
  );
}
