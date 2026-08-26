import type { AccessModule } from "@/types/api";

export type PortalModule = AccessModule | "MANAGEMENT" | "SETTINGS";

export interface User {
  id: number;
  name: string;
  email: string;
  contact_number: string | null;
  is_active: boolean;
  last_login_at: string | null;
  role: {
    id: number;
    name: string;
    slug: string;
    is_full_access: boolean;
  } | null;
  modules?: AccessModule[];
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}
