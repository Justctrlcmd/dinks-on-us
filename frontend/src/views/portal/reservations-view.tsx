import { FiSearch } from "react-icons/fi";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function ReservationsView() {
  return (
    <div className="grid gap-8">
      <PageHeader
        title="Reservations"
        description="Review reservations that still require verification or operational attention."
      />

      <Card>
        <CardHeader>
          <CardTitle>Operational reservations</CardTitle>
          <CardDescription>
            Waiting, verified, upcoming, and ongoing reservations remain here until finalized.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <form role="search" className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_repeat(3,minmax(150px,0.35fr))]">
            <label className="relative">
              <span className="sr-only">Search reservations</span>
              <FiSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input className="h-10 pl-9" type="search" placeholder="Reference, customer, contact, or payment reference" />
            </label>
            <label>
              <span className="sr-only">Reservation status</span>
              <select className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option>All active statuses</option>
                <option>Waiting for verification</option>
                <option>Verified</option>
                <option>Upcoming</option>
                <option>Ongoing</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Reservation source</span>
              <select className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option>All sources</option>
                <option>Online</option>
                <option>Walk-in</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Court</span>
              <select className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option>All courts</option>
                <option>Court 1</option>
                <option>Court 2</option>
                <option>Court 3</option>
              </select>
            </label>
          </form>

          <EmptyState
            title="No reservation data connected yet."
            description="Reservations will appear here with status, schedule, customer, source, and total once the management API is implemented."
          />
        </CardContent>
      </Card>
    </div>
  );
}
