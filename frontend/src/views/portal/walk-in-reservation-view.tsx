import Link from "next/link";
import { FiArrowLeft } from "react-icons/fi";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { WalkInReservationForm } from "@/forms/reservations/walk-in-reservation-form";

export function WalkInReservationView() {
  return (
    <div className="grid gap-5">
      <PageHeader
        title="Add Walk-in"
        description="Create a verified reservation and record the customer's payment at the facility."
        actions={<Button nativeButton={false} variant="outline" render={<Link href="/portal/reservations" />}><FiArrowLeft aria-hidden="true" /> Reservations</Button>}
      />
      <WalkInReservationForm />
    </div>
  );
}
