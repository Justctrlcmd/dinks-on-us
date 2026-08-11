"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { useCurrentUser } from "@/hooks/queries/use-current-user";
import { isApiError } from "@/lib/api";

export function AuthBoundary({ children }: { children: React.ReactNode }) {
  const router = useRouter(); const query = useCurrentUser();
  useEffect(() => { if (query.error && isApiError(query.error) && query.error.status === 401) router.replace("/login?expired=1"); }, [query.error, router]);
  if (query.isPending || (query.error && isApiError(query.error) && query.error.status === 401)) return <LoadingState fullPage message="Loading your account..." />;
  if (query.error) return <ErrorState title="We couldn't load your account." description="Check your connection and try again." onRetry={() => query.refetch()} />;
  return children;
}
