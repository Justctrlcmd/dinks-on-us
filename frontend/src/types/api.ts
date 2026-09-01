export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export type AccessModule =
  | "DASHBOARD"
  | "RESERVATION"
  | "HISTORY"
  | "MANAGEMENT_COURT_PRICING"
  | "MANAGEMENT_AVAILABILITY_CLOSURES"
  | "MANAGEMENT_PAYMENT_METHODS"
  | "MANAGEMENT_STORAGE_RETENTION"
  | "MANAGEMENT_TEAM_ACCESS"
  | "MANAGEMENT_RULES_POLICIES"
  | "MANAGEMENT_EVENTS"
  | "MANAGEMENT_GALLERY"
  | "MANAGEMENT_FAQS"
  | "REPORTS";

export interface ApiResponse<TData = null> {
  success: boolean;
  message: string;
  code: string | null;
  data: TData;
  errors: Record<string, string[]> | null;
  meta: PaginationMeta | null;
}

export interface ApiError {
  status: number;
  message: string;
  code: string | null;
  errors?: Record<string, string[]>;
}
