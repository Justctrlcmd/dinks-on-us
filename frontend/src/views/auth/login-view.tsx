"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AuthCardView } from "./auth-card-view";
import { ErrorState } from "@/components/common/error-state";
import { LoadingState } from "@/components/common/loading-state";
import { LoginForm } from "@/forms/auth/login-form";
import { useCurrentUser } from "@/hooks/queries/use-current-user";
import { isApiError } from "@/lib/api";

export function LoginView() {
  const router = useRouter();
  const query = useCurrentUser({ refetchOnMount: "always" });
  const checkingSession = query.isPending || query.isFetching;
  const guest = isApiError(query.error)
    && (query.error.status === 401 || query.error.code === "ACCOUNT_INACTIVE");

  useEffect(() => {
    if (query.data && !query.error && !checkingSession) router.replace("/portal");
  }, [query.data, query.error, checkingSession, router]);

  return (
    <AuthCardView
      title="Admin Login"
      description="Enter your credentials to access your account."
      showBackToHome
    >
      {checkingSession || (query.data && !query.error) ? (
        <LoadingState message="Checking your session..." />
      ) : query.error && !guest ? (
        <ErrorState
          title="We couldn't check your session."
          description="Check your connection and try again."
          onRetry={() => void query.refetch()}
        />
      ) : (
        <LoginForm />
      )}
    </AuthCardView>
  );
}
