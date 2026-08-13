export const MOCK_TODAY = "2026-08-13";
export const MOCK_INITIAL_WEEK_START = "2026-08-10";

export const mockCourts = [
  { id: 1, name: "Court 1" },
  { id: 2, name: "Court 2" },
  { id: 3, name: "Court 3" },
] as const;

export const mockEquipment = [
  { id: "paddle", name: "Paddle", price: 100, unit: "each", maximum: 12 },
  { id: "ball", name: "Ball", price: 30, unit: "each", maximum: 20 },
  { id: "titan-machine", name: "Titan Machine", price: 500, unit: "per hour", maximum: 17 },
] as const;

export type MockEquipmentId = (typeof mockEquipment)[number]["id"];

export type MockEquipmentQuantities = Record<MockEquipmentId, number>;

export type MockSlot = {
  courtId: number;
  courtName: string;
  date: string;
  startHour: number;
  endHour: number;
  available: boolean;
  price: number;
};

export type MockReservationDraft = {
  selectedSlots: MockSlot[];
  equipmentQuantities: MockEquipmentQuantities;
};

export const MOCK_RESERVATION_STORAGE_KEY = "dinks-on-us:mock-reservation-draft";

const closedDates = new Set(["2026-08-17"]);

export function isMockClosedDate(date: string) {
  return closedDates.has(date);
}

export function getMockSlots(date: string): MockSlot[] {
  const day = Number(date.slice(-2));

  return Array.from({ length: 17 }, (_, index) => index + 7).flatMap((startHour) =>
    mockCourts.map((court) => ({
      courtId: court.id,
      courtName: court.name,
      date,
      startHour,
      endHour: startHour + 1,
      available: !isMockClosedDate(date) && (startHour + court.id + day) % 6 !== 0,
      price: startHour < 17 ? 500 : 600,
    })),
  );
}
