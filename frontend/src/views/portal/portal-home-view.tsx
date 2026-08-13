import { FiCalendar, FiCheckCircle, FiClock, FiDollarSign } from "react-icons/fi";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const metrics = [
  { label: "Waiting for verification", icon: FiClock },
  { label: "Verified & upcoming", icon: FiCalendar },
  { label: "Completed today", icon: FiCheckCircle },
  { label: "Completed revenue", icon: FiDollarSign },
] as const;

const statusLegend = [
  { label: "Available", className: "bg-sidebar-primary text-sidebar-primary-foreground" },
  { label: "Waiting for verification", className: "border border-border bg-background text-foreground" },
  { label: "Verified", className: "bg-primary text-primary-foreground" },
  { label: "Blocked", className: "bg-muted text-muted-foreground" },
] as const;

export function PortalHomeView() {
  return (
    <div className="grid gap-8">
      <PageHeader
        title="Dashboard"
        description="Monitor reservations, court availability, and today’s operations."
      />

      <section aria-label="Operational summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, icon: Icon }) => (
          <Card key={label}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardDescription>{label}</CardDescription>
                <span className="grid size-9 place-items-center rounded-lg bg-muted text-primary">
                  <Icon aria-hidden="true" />
                </span>
              </div>
              <CardTitle className="font-heading text-3xl font-semibold">—</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(260px,0.75fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Weekly court availability</CardTitle>
            <CardDescription>Browse each court’s availability and operational state by date.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              title="Availability is ready to connect."
              description="Court schedules will appear here when the dashboard availability endpoint is implemented."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule legend</CardTitle>
            <CardDescription>Every state uses a written label and a supporting visual cue.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {statusLegend.map((status) => (
              <div key={status.label} className="flex items-center gap-3 text-sm">
                <span className={`size-3 rounded-full ${status.className}`} aria-hidden="true" />
                <span>{status.label}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
