import type { PaginationMeta } from "@/types/api";

export type ClosurePeriod = {
  start_hour: number;
  end_hour: number;
};

export type AvailabilityClosure = {
  id: number;
  type: "entire_operation" | "court_time";
  date: string;
  reason: string;
  court: { id: number; name: string } | null;
  periods: ClosurePeriod[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AvailabilityActivity = {
  id: number;
  action: "DATE_CLOSED" | "COURT_SLOT_BLOCKED" | "DATE_REOPENED" | "COURT_SLOT_REOPENED";
  actor_name: string;
  details: {
    closure_type: AvailabilityClosure["type"];
    date: string;
    court_id: number | null;
    court_name: string | null;
    periods: ClosurePeriod[];
    reason: string;
  };
  created_at: string;
};

export type PaginatedAvailabilityClosures = {
  data: AvailabilityClosure[];
  meta: PaginationMeta;
};

export type PaginatedAvailabilityActivity = {
  data: AvailabilityActivity[];
  meta: PaginationMeta;
};

export type WholeOperationClosureInput = {
  date: string;
  reason: string;
};

export type CourtTimeClosureInput = WholeOperationClosureInput & {
  court_id: number;
  periods: ClosurePeriod[];
};
