import type { PaginationMeta } from "@/types/api";

export type EventStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface EventRecord {
  id: number;
  header: string;
  slug: string;
  description: string;
  image_url: string;
  event_date: string;
  status: EventStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventInput {
  header: string;
  description: string;
  event_date: string;
  image?: File;
}

export interface PaginatedEvents {
  data: EventRecord[];
  meta: PaginationMeta;
}
