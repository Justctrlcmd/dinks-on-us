export type RatePeriod = {
  id?: number;
  start_hour: number;
  end_hour: number;
  price: number;
};

export type CourtConfiguration = {
  id: number;
  opening_hour: number;
  closing_hour: number;
  included_players_per_court: number;
  additional_player_price: number;
  advance_booking_days: number;
  weekday_rates: RatePeriod[];
  weekend_rates: RatePeriod[];
  created_at: string;
  updated_at: string;
};

export type CourtConfigurationInput = Omit<CourtConfiguration, "id" | "created_at" | "updated_at">;

export type Court = {
  id: number;
  court_number: number;
  name: string;
  created_at: string;
  updated_at: string;
};

export type CourtList = {
  courts: Court[];
  next_court_number: number;
  next_court_is_reactivation: boolean;
};

export type RentalEquipment = {
  id: number;
  name: string;
  price: number;
  total_quantity: number;
  is_active: boolean;
  available_quantity: number;
  slot_availability?: { date: string; start_hour: number; end_hour: number; available_quantity: number }[];
  created_at: string;
  updated_at: string;
};

export type RentalEquipmentInput = Pick<RentalEquipment, "name" | "price" | "total_quantity" | "is_active">;

export type ReservationOptionSlot = {
  start_hour: number;
  end_hour: number;
  price: number;
};

export type ReservationOptions = {
  date: string;
  configuration: CourtConfiguration | null;
  courts: Court[];
  slots: ReservationOptionSlot[];
  is_outside_booking_window: boolean;
  booking_window_end: string | null;
  is_date_closed: boolean;
  unavailable_slots: { court_id: number; start_hour: number }[];
  reserved_slots: { court_id: number; start_hour: number }[];
  past_slots: { court_id: number; start_hour: number }[];
  equipment: RentalEquipment[];
  equipment_confirmation: string;
};

export type ReservationClosedDates = {
  closed_dates: string[];
};
