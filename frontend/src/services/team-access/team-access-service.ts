import { authFetch } from "@/lib/api";
import type {
  AccessInput,
  AccessOverview,
  AccessProfile,
  CreateTeamInput,
  ResetTeamPasswordInput,
  TeamInput,
  TeamMember,
} from "@/types/team-access";

export const getAccessOverview = (signal?: AbortSignal) =>
  authFetch<AccessOverview>("/api/v1/management/roles", { signal });

export const createAccess = (input: AccessInput) =>
  authFetch<AccessProfile>("/api/v1/management/roles", {
    method: "POST",
    csrf: true,
    body: JSON.stringify(input),
  });

export const updateAccess = ({ id, input }: { id: number; input: AccessInput }) =>
  authFetch<AccessProfile>(`/api/v1/management/roles/${id}`, {
    method: "PATCH",
    csrf: true,
    body: JSON.stringify(input),
  });

export const deleteAccess = ({ id, current_password }: { id: number; current_password: string }) =>
  authFetch<null>(`/api/v1/management/roles/${id}`, {
    method: "DELETE",
    csrf: true,
    body: JSON.stringify({ current_password }),
  });

export const getTeam = (page: number, signal?: AbortSignal) =>
  authFetch<TeamMember[]>(`/api/v1/management/staff?page=${page}`, { signal });

export const createTeamMember = (input: CreateTeamInput) =>
  authFetch<TeamMember>("/api/v1/management/staff", {
    method: "POST",
    csrf: true,
    body: JSON.stringify(input),
  });

export const updateTeamMember = ({ id, input }: { id: number; input: TeamInput }) =>
  authFetch<TeamMember>(`/api/v1/management/staff/${id}`, {
    method: "PATCH",
    csrf: true,
    body: JSON.stringify(input),
  });

export const activateTeamMember = (id: number) =>
  authFetch<TeamMember>(`/api/v1/management/staff/${id}/activate`, {
    method: "POST",
    csrf: true,
  });

export const deactivateTeamMember = (id: number) =>
  authFetch<TeamMember>(`/api/v1/management/staff/${id}/deactivate`, {
    method: "POST",
    csrf: true,
  });

export const deleteTeamMember = ({ id, current_password }: { id: number; current_password: string }) =>
  authFetch<null>("/api/v1/management/staff/" + id, {
    method: "DELETE",
    csrf: true,
    body: JSON.stringify({ current_password }),
  });

export const resetTeamMemberPassword = ({ id, input }: { id: number; input: ResetTeamPasswordInput }) =>
  authFetch<null>(`/api/v1/management/staff/${id}/password`, {
    method: "PUT",
    csrf: true,
    body: JSON.stringify(input),
  });
