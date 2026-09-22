"use client";

import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { isApiError } from "@/lib/api";
import { startRateLimitCooldown, useRateLimitCooldown } from "@/lib/rate-limit-cooldown";

const fallbackCooldownSeconds = 120;

export function useRateLimitedMutation<TData, TError = Error, TVariables = void, TContext = unknown>(
  rateLimitKey: string,
  options: UseMutationOptions<TData, TError, TVariables, TContext>,
) {
  const cooldown = useRateLimitCooldown(rateLimitKey);
  const mutation = useMutation({
    ...options,
    meta: { ...options.meta, rateLimitKey },
    onError: (error, variables, onMutateResult, context) => {
      if (isApiError(error) && error.status === 429) {
        startRateLimitCooldown(rateLimitKey, error.retryAfterSeconds ?? fallbackCooldownSeconds);
      }

      return options.onError?.(error, variables, onMutateResult, context);
    },
  });

  return { ...mutation, rateLimitCooldown: cooldown };
}
