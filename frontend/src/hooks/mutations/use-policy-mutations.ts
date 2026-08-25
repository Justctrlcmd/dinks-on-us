"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
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

export function useCreatePolicySubheader() { const refresh = useRefreshPolicies(); return useMutation({ mutationFn: createPolicySubheader, onSuccess: refresh }); }
export function useUpdatePolicySubheader() { const refresh = useRefreshPolicies(); return useMutation({ mutationFn: updatePolicySubheader, onSuccess: refresh }); }
export function useDeletePolicySubheader() { const refresh = useRefreshPolicies(); return useMutation({ mutationFn: deletePolicySubheader, onSuccess: refresh }); }
export function useCreatePolicyRule() { const refresh = useRefreshPolicies(); return useMutation({ mutationFn: createPolicyRule, onSuccess: refresh }); }
export function useUpdatePolicyRule() { const refresh = useRefreshPolicies(); return useMutation({ mutationFn: updatePolicyRule, onSuccess: refresh }); }
export function useDeletePolicyRule() { const refresh = useRefreshPolicies(); return useMutation({ mutationFn: deletePolicyRule, onSuccess: refresh }); }
export function useUpdatePolicySubheaderOrder() { const refresh = useRefreshPolicies(); return useMutation({ mutationFn: updatePolicySubheaderOrder, onSuccess: refresh }); }
export function useUpdatePolicyRuleOrder() { const refresh = useRefreshPolicies(); return useMutation({ mutationFn: updatePolicyRuleOrder, onSuccess: refresh }); }
