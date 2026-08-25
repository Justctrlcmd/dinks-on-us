import { FiCheck } from "react-icons/fi";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ManagementArea } from "@/config/management";

export function ManagementAreaView({ area }: { area: ManagementArea }) {
  const Icon = area.icon;

  return (
    <div className="grid gap-8">
      <PageHeader title={area.title} description={area.description} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.7fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{area.title} workspace</CardTitle>
            <CardDescription>This dedicated workspace is prepared for its management API, forms, ordering controls, and record actions.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              title={`No ${area.title.toLowerCase()} data connected yet.`}
              description="Records will appear here with the actions and ordering controls appropriate to this workspace when its backend workflow is implemented."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <span className="mb-3 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <CardTitle>Area scope</CardTitle>
            <CardDescription>Capabilities defined by the current project documentation.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-3 text-sm">
              {area.capabilities.map((capability) => (
                <li key={capability} className="flex items-start gap-2.5">
                  <FiCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{capability}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
