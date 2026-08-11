export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

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
