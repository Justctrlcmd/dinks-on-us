"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { canAccessPortalModule, getRequiredPortalModule } from "@/config/navigation";
import type { User } from "@/types/user";

export function PortalAccessBoundary({ children, user }: { children: React.ReactNode; user: User }) {
  const pathname = usePathname();
  const requiredModule = getRequiredPortalModule(pathname);

  if (requiredModule && !canAccessPortalModule(user, requiredModule)) {
    return (
      <div role="alert" className="mx-auto mt-12 max-w-xl rounded-xl border bg-card p-8 text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
          <span className="text-lg font-semibold" aria-hidden="true">403</span>
        </div>
        <h1 className="font-heading text-xl font-semibold">This module is not available to your role.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Ask a Manager to update your assigned role if you need access to this area.
        </p>
        <Button className="mt-5" variant="outline" nativeButton={false} render={<Link href="/portal" />}>
          <FiArrowLeft aria-hidden="true" />
          Back to dashboard
        </Button>
      </div>
    );
  }

  return children;
}
