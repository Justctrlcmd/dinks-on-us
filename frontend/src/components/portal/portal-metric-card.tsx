import type { IconType } from "react-icons";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function PortalMetricCard({ label, value, icon: Icon, iconClassName }: {
  label: string;
  value?: number | string;
  icon: IconType;
  iconClassName: string;
}) {
  return (
    <Card className="min-h-24 justify-center py-4">
      <CardContent className="flex items-center gap-4 px-4">
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${iconClassName}`}><Icon aria-hidden className="size-5" /></span>
        <div>
          {value === undefined ? <Skeleton className="mb-1 h-6 w-10" /> : <p className="font-heading text-xl font-bold leading-none">{value}</p>}
          <p className="mt-1.5 text-sm font-medium text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
