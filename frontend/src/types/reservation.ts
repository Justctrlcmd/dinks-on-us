export const RESERVATION_DRAFT_STORAGE_KEY = "dinks-on-us:reservation-draft";

import type { PaginationMeta } from "@/types/api";

export type ReservationSlot = {
  courtId: number;
  courtName: string;
  date: string;
  startHour: number;
  endHour: number;
  available: boolean;
  availabilityStatus?: "available" | "reserved" | "closed" | "past";
  price: number;
};

export type ReservationEquipmentSelection = {
  id: number;
  name: string;
  price: number;
  quantity: number;
};

export type ReservationDraft = {
  selectedSlots: ReservationSlot[];
  equipment: ReservationEquipmentSelection[];
  additionalPlayers: number;
  additionalPlayerUnitPrice: number;
  includedPlayersPerCourt: number;
};

export type ReservationPaymentChannel = "CASH" | "EWALLET" | "BANK";
export type WalkInPaymentChannel = "CASH" | "EWALLET_BANK";

export type ReservationStatus = "PENDING" | "VERIFIED" | "RESCHEDULED" | "ONGOING" | "COMPLETED" | "REJECTED" | "CANCELLED" | "NO_SHOW";

export type ManagementReservationSlot = {
  id: number;
  court_id: number;
  court_name: string;
  date: string;
  start_hour: number;
  end_hour: number;
  amount: number;
  kind: string;
};

export type ManagementReservation = {
  id: number;
  reference_number: string;
  source: ReservationSource;
  booking_date: string;
  customer: { name: string; email: string; contact_number: string };
  status: Exclude<ReservationStatus, "RESCHEDULED">;
  display_status: ReservationStatus;
  is_rescheduled: boolean;
  reschedule_count: number;
  amounts: { original: number; adjustments: number; final: number; paid: number; outstanding: number; refundable_credit: number };
  slots?: ManagementReservationSlot[];
  equipment?: Array<{ id: number; equipment_id: number | null; name: string; quantity: number; unit_amount: number; total_amount: number; kind: string }>;
  additional_players: { original_quantity: number; unit_amount: number };
  payments?: Array<{ id: number; method: string | null; channel: string; kind: string; status: string; amount: number; reference_number: string | null; proof_url: string | null }>;
  adjustments?: Array<{ id: number; type: string; description: string; quantity: number; unit_amount: number; total_amount: number }>;
  schedule_history?: Array<{ id: number; old_booking_date: string; new_booking_date: string; old_slots: unknown[]; new_slots: unknown[]; difference_amount: number; created_at: string }>;
  refunds?: Array<{ id: number; type: string; status: string; amount: number; reason: string | null }>;
  rejection: { concern: string; reason: string } | null;
  cancellation_reason: string | null;
  timestamps: Record<string, string | null>;
};

export type ReservationKpis = { pending: number; ongoing: number; verified: number; rescheduled: number };
export type ReservationListData = { reservations: ManagementReservation[]; kpis: ReservationKpis };
export type ReservationListResponse = ReservationListData & { meta?: PaginationMeta };
export type ReservationFilters = { page: number; search: string; status: "" | ReservationStatus };
export type FinalReservationStatus = Extract<ReservationStatus, "COMPLETED" | "CANCELLED" | "REJECTED" | "NO_SHOW">;
export type ReservationSource = "ONLINE" | "WALK_IN";
export type HistoryKpis = { completed: number; cancelled: number; rejected: number; no_show: number };
export type HistoryListData = { reservations: ManagementReservation[]; kpis: HistoryKpis };
export type HistoryFilters = { page: number; search: string; status: "" | FinalReservationStatus; source: "" | ReservationSource };
export type SlotInput = { court_id: number; date: string; start_hour: number };
export type ReservationAddOnsInput = {
  slots?: SlotInput[];
  additional_players?: number;
  equipment?: Array<{ id: number; quantity: number }>;
  payment_channel: ReservationPaymentChannel;
  payment_reference_number?: string;
  payment_proof?: File;
};

export type WalkInReservationInput = {
  customer_name: string;
  customer_email: string;
  customer_contact_number: string;
  slots: SlotInput[];
  equipment: Array<{ id: number; quantity: number }>;
  additional_players: number;
  payment_channel: WalkInPaymentChannel;
  payment_reference_number?: string;
  payment_proof?: File;
};
