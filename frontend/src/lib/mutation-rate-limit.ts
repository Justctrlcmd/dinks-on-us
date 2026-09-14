import type { RateLimitCooldown } from "@/lib/rate-limit-cooldown";

type RateLimitAwareMutation = {
  rateLimitCooldown?: RateLimitCooldown;
};

export function isMutationRateLimited(...mutations: RateLimitAwareMutation[]): boolean {
  return mutations.some((mutation) => mutation.rateLimitCooldown?.isCoolingDown === true);
}

export function mutationButtonLabel(
  pendingLabel: string,
  idleLabel: string,
  ...mutations: RateLimitAwareMutation[]
): string {
  const cooldown = mutations.find((mutation) => mutation.rateLimitCooldown?.isCoolingDown)?.rateLimitCooldown;
  if (cooldown) return cooldown.label;
  return mutations.some((mutation) => (mutation as { isPending?: boolean }).isPending) ? pendingLabel : idleLabel;
}
