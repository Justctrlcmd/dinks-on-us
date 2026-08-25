export const RESERVATION_DRAFT_STORAGE_KEY = "dinks-on-us:reservation-draft";

export type ReservationSlot = {
  courtId: number;
  courtName: string;
  date: string;
  startHour: number;
  endHour: number;
  available: boolean;
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
