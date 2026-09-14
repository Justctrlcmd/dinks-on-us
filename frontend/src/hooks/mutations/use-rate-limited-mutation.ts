"use client";

import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { useRateLimitCooldown } from "@/lib/rate-limit-cooldown";

export function useRateLimitedMutation<TData, TError = Error, TVariables = void, TContext = unknown>(
  rateLimitKey: string,
  options: UseMutationOptions<TData, TError, TVariables, TContext>,
) {
  const cooldown = useRateLimitCooldown(rateLimitKey);
  const mutation = useMutation({
    ...options,
    meta: { ...options.meta, rateLimitKey },
  });

  return { ...mutation, rateLimitCooldown: cooldown };
}
