"use client";

import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/components/common/toast-provider";
import { isApiError } from "@/lib/api";

function responseMessage(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const response = value as { success?: unknown; message?: unknown };
  return response.success === true && typeof response.message === "string" && response.message.trim()
    ? response.message
    : null;
}

function apiErrorMessage(error: unknown): string {
  if (!isApiError(error)) return "Something went wrong. Please try again.";

  const validationMessage = Object.values(error.errors ?? {})
    .flat()
    .find((message): message is string => typeof message === "string" && message.trim().length > 0);

  return validationMessage ?? error.message;
}

function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= 1) return false;
  if (!isApiError(error)) return false;
  return error.code === "NETWORK_ERROR" || error.status >= 500;
}

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const [client] = useState(() => new QueryClient({
    mutationCache: new MutationCache({
      onSuccess: (data) => {
        const message = responseMessage(data);
        if (message) toast.success(message);
      },
      onError: (error) => {
        const message = apiErrorMessage(error);

        if (isApiError(error) && (error.status === 409 || error.status === 429)) {
          toast.warning(message);
          return;
        }

        toast.error(message);
      },
    }),
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
        retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 10_000),
      },
    },
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
