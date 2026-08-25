import { authFetch, publicFetch } from "@/lib/api";
import type { PolicyRule, PolicyRuleInput, PolicySection, PolicySubheader, PolicySubheaderInput } from "@/types/policy";

export const getPublicPolicies = (signal?: AbortSignal) =>
  publicFetch<PolicySection[]>("/api/v1/public/policies", { signal });

export const getManagementPolicies = (signal?: AbortSignal) =>
  authFetch<PolicySection[]>("/api/v1/management/policy-sections", { signal });

export const createPolicySubheader = ({ sectionId, input }: { sectionId: number; input: PolicySubheaderInput }) =>
  authFetch<PolicySubheader>(`/api/v1/management/policy-sections/${sectionId}/subheaders`, {
    method: "POST", csrf: true, body: JSON.stringify(input),
  });

export const updatePolicySubheader = ({ id, input }: { id: number; input: PolicySubheaderInput }) =>
  authFetch<PolicySubheader>(`/api/v1/management/policy-subheaders/${id}`, {
    method: "PATCH", csrf: true, body: JSON.stringify(input),
  });

export const deletePolicySubheader = (id: number) =>
  authFetch<null>(`/api/v1/management/policy-subheaders/${id}`, { method: "DELETE", csrf: true });

export const updatePolicySubheaderOrder = ({ sectionId, ids }: { sectionId: number; ids: number[] }) =>
  authFetch<PolicySubheader[]>(`/api/v1/management/policy-sections/${sectionId}/subheader-order`, {
    method: "PATCH", csrf: true, body: JSON.stringify({ ids }),
  });

export const createPolicyRule = ({ sectionId, input }: { sectionId: number; input: PolicyRuleInput }) =>
  authFetch<PolicyRule>(`/api/v1/management/policy-sections/${sectionId}/rules`, {
    method: "POST", csrf: true, body: JSON.stringify(input),
  });

export const updatePolicyRule = ({ id, input }: { id: number; input: PolicyRuleInput }) =>
  authFetch<PolicyRule>(`/api/v1/management/policy-rules/${id}`, {
    method: "PATCH", csrf: true, body: JSON.stringify(input),
  });

export const deletePolicyRule = (id: number) =>
  authFetch<null>(`/api/v1/management/policy-rules/${id}`, { method: "DELETE", csrf: true });

export const updatePolicyRuleOrder = ({ subheaderId, ids }: { subheaderId: number; ids: number[] }) =>
  authFetch<PolicyRule[]>(`/api/v1/management/policy-subheaders/${subheaderId}/rule-order`, {
    method: "PATCH", csrf: true, body: JSON.stringify({ ids }),
  });
