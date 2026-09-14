import type { PaginationMeta } from "@/types/api";

export type ActionLog = {
  id: number;
  actor_name: string;
  action: string;
  action_label: string;
  module: string;
  target_label: string | null;
  created_at: string;
};

export type ActionLogFilters = {
  page: number;
  search: string;
  module: string;
};

export type PaginatedActionLogs = {
  data: ActionLog[];
  meta: PaginationMeta;
};
