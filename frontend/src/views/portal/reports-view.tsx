import { FiBarChart2, FiClock, FiGrid, FiTrendingUp } from "react-icons/fi";
import { LuPhilippinePeso } from "react-icons/lu";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const reports = [
  { title: "Revenue", description: "Completed reservations and their final amounts, grouped by day, week, or month.", icon: LuPhilippinePeso },
  { title: "Reservation trends", description: "Completed, rejected, cancelled, no-show, online, and walk-in activity.", icon: FiTrendingUp },
  { title: "Court utilization", description: "Reserved and completed hours for each court across a selected period.", icon: FiGrid },
  { title: "Popular times", description: "Frequently used reservation hours derived from reservation slots.", icon: FiClock },
] as const;

export function ReportsView() {
  return (
    <div className="grid gap-8">
      <PageHeader
        title="Reports"
        description="Understand completed revenue, reservation trends, court usage, and popular times."
      />

      <section aria-label="Available reports" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {reports.map(({ title, description, icon: Icon }) => (
          <Card key={title}>
            <CardHeader>
              <span className="mb-3 grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon aria-hidden="true" className="size-5" />
              </span>
              <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>{description}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FiBarChart2 aria-hidden="true" /> Report results</CardTitle>
          <CardDescription>All reports will use transactional reservation data rather than duplicated totals.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="Report data is ready to connect."
            description="Charts, accessible summaries, and date filters will appear here when the reporting endpoints are implemented."
          />
        </CardContent>
      </Card>
    </div>
  );
}
