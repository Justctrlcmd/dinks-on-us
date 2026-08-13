import Link from "next/link";
import { FiArrowUpRight } from "react-icons/fi";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { managementAreas } from "@/config/management";

export function ManagementView() {
  return (
    <div className="grid gap-8">
      <PageHeader
        title="Management"
        description="Configure business operations, staff access, availability, and public website content."
      />

      <section aria-label="Management areas" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {managementAreas.map(({ slug, title, description, icon: Icon }) => (
          <Link key={slug} href={`/portal/management/${slug}`} className="group rounded-xl focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Card className="h-full transition-colors group-hover:bg-muted/60">
              <CardHeader>
                <div className="mb-3 flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <FiArrowUpRight className="size-4 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                </div>
                <CardTitle>{title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>
    </div>
  );
}
