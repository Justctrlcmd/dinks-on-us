import { authFetch, publicFetch } from "@/lib/api";
import type {
  Court,
  CourtConfiguration,
  CourtConfigurationInput,
  CourtList,
  RentalEquipment,
  RentalEquipmentInput,
  ReservationClosedDates,
  ReservationOptions,
} from "@/types/court-pricing";

export async function getCourtPricingManagement(signal?: AbortSignal) {
  const [configuration, courts, equipment] = await Promise.all([
    authFetch<CourtConfiguration | null>("/api/v1/management/court-configuration", { signal }),
    authFetch<CourtList>("/api/v1/management/courts", { signal }),
    authFetch<RentalEquipment[]>("/api/v1/management/rental-equipment", { signal }),
  ]);

  return {
    configuration: configuration.data,
    courts: courts.data.courts,
    nextCourtNumber: courts.data.next_court_number,
    nextCourtIsReactivation: courts.data.next_court_is_reactivation,
    equipment: equipment.data,
  };
}

export const updateCourtConfiguration = (input: CourtConfigurationInput) =>
  authFetch<CourtConfiguration>("/api/v1/management/court-configuration", {
    method: "PUT",
    csrf: true,
    body: JSON.stringify(input),
  });

export const createCourt = () =>
  authFetch<Court>("/api/v1/management/courts", { method: "POST", csrf: true });

export const deleteCourt = (id: number) =>
  authFetch<null>(`/api/v1/management/courts/${id}`, { method: "DELETE", csrf: true });

export const createRentalEquipment = (input: RentalEquipmentInput) =>
  authFetch<RentalEquipment>("/api/v1/management/rental-equipment", {
    method: "POST",
    csrf: true,
    body: JSON.stringify(input),
  });

export const updateRentalEquipment = ({ id, input }: { id: number; input: RentalEquipmentInput }) =>
  authFetch<RentalEquipment>(`/api/v1/management/rental-equipment/${id}`, {
    method: "PATCH",
    csrf: true,
    body: JSON.stringify(input),
  });

export const deleteRentalEquipment = (id: number) =>
  authFetch<null>(`/api/v1/management/rental-equipment/${id}`, { method: "DELETE", csrf: true });

export const getReservationOptions = (date: string, signal?: AbortSignal, hours: number[] = []) => {
  const query = new URLSearchParams({ date });
  hours.forEach((hour) => query.append("hours[]", String(hour)));
  return publicFetch<ReservationOptions>(`/api/v1/public/reservation-options?${query}`, { signal });
};

export const getReservationClosedDates = (signal?: AbortSignal) =>
  publicFetch<ReservationClosedDates>("/api/v1/public/closed-dates", { signal });
