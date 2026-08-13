export type PortalModule =
  | "DASHBOARD"
  | "RESERVATION"
  | "HISTORY"
  | "MANAGEMENT"
  | "REPORTS"
  | "SETTINGS";

export interface User {
  id: number;
  name: string;
  email: string;
  role: {
    id: number;
    name: string;
    slug: string;
    is_full_access: boolean;
  } | null;
  modules?: PortalModule[];
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}
