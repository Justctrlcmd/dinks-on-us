import { FiArchive, FiSearch } from "react-icons/fi";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function HistoryView() {
  return (
    <div className="grid gap-8">
      <PageHeader
        title="History"
        description="Review finalized reservation records and their preserved operational history."
      />

      <div className="flex items-start gap-3 rounded-xl border bg-card p-4 text-sm">
        <FiArchive className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" />
        <div>
          <p className="font-medium">History is read-only by default.</p>
          <p className="mt-0.5 text-muted-foreground">
            Completed, cancelled, rejected, and no-show records should not be casually reopened or edited.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Finalized reservations</CardTitle>
          <CardDescription>Search historical records by reference, customer, court, source, or date.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <form role="search" className="grid gap-3 md:grid-cols-[minmax(260px,1fr)_repeat(2,minmax(170px,0.35fr))]">
            <label className="relative">
              <span className="sr-only">Search reservation history</span>
              <FiSearch className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input className="h-10 pl-9" type="search" placeholder="Search finalized reservations" />
            </label>
            <label>
              <span className="sr-only">Final status</span>
              <select className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
                <option>All final statuses</option>
                <option>Completed</option>
                <option>Cancelled</option>
                <option>Rejected</option>
                <option>No-show</option>
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
          </form>

          <EmptyState
            title="No historical data connected yet."
            description="Finalized reservations and their schedule, status, and payment snapshots will appear here."
          />
        </CardContent>
      </Card>
    </div>
  );
}
