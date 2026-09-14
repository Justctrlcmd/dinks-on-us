"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRateLimitedMutation } from "@/hooks/mutations/use-rate-limited-mutation";
import { policyKeys } from "@/config/query-keys";
import {
  createPolicyRule, createPolicySubheader, deletePolicyRule, deletePolicySubheader, updatePolicyRule,
  updatePolicyRuleOrder, updatePolicySubheader, updatePolicySubheaderOrder,
} from "@/services/policy/policy-service";

function useRefreshPolicies() {
  const client = useQueryClient();
  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: policyKeys.management() }),
      client.invalidateQueries({ queryKey: policyKeys.public() }),
    ]);
  };
}

export function useCreatePolicySubheader() { const refresh = useRefreshPolicies(); return useRateLimitedMutation("policy-subheader-create", { mutationFn: createPolicySubheader, onSuccess: refresh }); }
export function useUpdatePolicySubheader() { const refresh = useRefreshPolicies(); return useRateLimitedMutation("policy-subheader-update", { mutationFn: updatePolicySubheader, onSuccess: refresh }); }
export function useDeletePolicySubheader() { const refresh = useRefreshPolicies(); return useRateLimitedMutation("policy-subheader-delete", { mutationFn: deletePolicySubheader, onSuccess: refresh }); }
export function useCreatePolicyRule() { const refresh = useRefreshPolicies(); return useRateLimitedMutation("policy-rule-create", { mutationFn: createPolicyRule, onSuccess: refresh }); }
export function useUpdatePolicyRule() { const refresh = useRefreshPolicies(); return useRateLimitedMutation("policy-rule-update", { mutationFn: updatePolicyRule, onSuccess: refresh }); }
export function useDeletePolicyRule() { const refresh = useRefreshPolicies(); return useRateLimitedMutation("policy-rule-delete", { mutationFn: deletePolicyRule, onSuccess: refresh }); }
export function useUpdatePolicySubheaderOrder() { const refresh = useRefreshPolicies(); return useRateLimitedMutation("policy-subheader-order", { mutationFn: updatePolicySubheaderOrder, onSuccess: refresh }); }
export function useUpdatePolicyRuleOrder() { const refresh = useRefreshPolicies(); return useRateLimitedMutation("policy-rule-order", { mutationFn: updatePolicyRuleOrder, onSuccess: refresh }); }
