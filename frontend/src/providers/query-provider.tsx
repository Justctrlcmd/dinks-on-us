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

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const toast = useToast();
  const [client] = useState(() => new QueryClient({
    mutationCache: new MutationCache({
      onSuccess: (data) => {
        const message = responseMessage(data);
        if (message) toast.success(message);
      },
      onError: (error) => {
        const message = isApiError(error)
          ? error.message
          : "Something went wrong. Please try again.";

        if (isApiError(error) && (error.status === 409 || error.status === 429)) {
          toast.warning(message);
          return;
        }

        toast.error(message);
      },
    }),
    defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
  }));
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
