import type { AccessModule, PaginationMeta } from "@/types/api";

export interface AccessModuleOption {
  key: AccessModule;
  name: string;
  description: string;
  group: "MANAGEMENT" | null;
}

export interface AccessProfile {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  is_protected: boolean;
  is_full_access: boolean;
  modules: AccessModule[];
  team_count: number;
  created_at: string;
  updated_at: string;
}

export interface AccessOverview {
  accesses: AccessProfile[];
  modules: AccessModuleOption[];
  summary: {
    total_team: number;
    active_team: number;
    inactive_team: number;
    access_profiles: number;
  };
}

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  contact_number: string;
  is_active: boolean;
  last_login_at: string | null;
  access: { id: number; name: string };
  created_at: string;
  updated_at: string;
}

export interface TeamPage {
  data: TeamMember[];
  meta: PaginationMeta;
}

export interface AccessInput {
  name: string;
  modules: AccessModule[];
  current_password: string;
}

export interface TeamInput {
  name: string;
  email: string;
  contact_number: string;
  role_id: number;
}

export interface CreateTeamInput extends TeamInput {
  password: string;
  password_confirmation: string;
}

export interface ResetTeamPasswordInput {
  password: string;
  password_confirmation: string;
  current_password: string;
}
