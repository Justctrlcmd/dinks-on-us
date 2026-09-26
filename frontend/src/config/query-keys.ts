export const authKeys = {
  all: ["auth"] as const,
  currentUser: () => [...authKeys.all, "current-user"] as const,
};

export const accountKeys = {
  all: ["account"] as const,
  profile: () => [...accountKeys.all, "profile"] as const,
};

export const faqKeys = {
  all: ["faqs"] as const,
  public: () => [...faqKeys.all, "public"] as const,
  management: () => [...faqKeys.all, "management"] as const,
};

export const eventKeys = {
  all: ["events"] as const,
  publicList: (page: number) => [...eventKeys.all, "public", "list", page] as const,
  publicDetail: (slug: string) => [...eventKeys.all, "public", "detail", slug] as const,
  management: (page: number) => [...eventKeys.all, "management", page] as const,
};

export const galleryKeys = {
  all: ["gallery"] as const,
  public: () => [...galleryKeys.all, "public"] as const,
  tabs: () => [...galleryKeys.all, "management", "tabs"] as const,
  images: (tabId: number) => [...galleryKeys.all, "management", "images", tabId] as const,
};

export const policyKeys = {
  all: ["policies"] as const,
  public: () => [...policyKeys.all, "public"] as const,
  management: () => [...policyKeys.all, "management"] as const,
};

export const courtPricingKeys = {
  all: ["court-pricing"] as const,
  management: () => [...courtPricingKeys.all, "management"] as const,
  closedDates: () => [...courtPricingKeys.all, "closed-dates"] as const,
  reservationOptions: (date: string, hours: number[] = [], scope: "public" | "management" = "public") => [...courtPricingKeys.all, "reservation-options", scope, date, hours] as const,
};

export const availabilityClosureKeys = {
  all: ["availability-closures"] as const,
  closures: (page: number) => [...availabilityClosureKeys.all, "closures", page] as const,
  activity: (page: number) => [...availabilityClosureKeys.all, "activity", page] as const,
};

export const paymentMethodKeys = {
  all: ["payment-methods"] as const,
  public: () => [...paymentMethodKeys.all, "public"] as const,
  management: () => [...paymentMethodKeys.all, "management"] as const,
};

export const paymentProofRetentionKeys = {
  all: ["payment-proof-retention"] as const,
  preview: (range: { from: string; to: string } | null) => [...paymentProofRetentionKeys.all, "preview", range] as const,
  activity: (page: number) => [...paymentProofRetentionKeys.all, "activity", page] as const,
};

export const actionLogKeys = {
  all: ["action-logs"] as const,
  list: (filters: { page: number; search: string; module: string; date: string }) => [...actionLogKeys.all, "list", filters] as const,
};

export const teamAccessKeys = {
  all: ["team-access"] as const,
  accesses: () => [...teamAccessKeys.all, "accesses"] as const,
  team: (page: number) => [...teamAccessKeys.all, "team", page] as const,
};

export const reservationKeys = {
  all: ["reservations"] as const,
  list: (filters: { page: number; search: string; status: string }) => [...reservationKeys.all, "list", filters] as const,
  pendingCount: () => [...reservationKeys.all, "pending-count"] as const,
  detail: (id: number) => [...reservationKeys.all, "detail", id] as const,
};

export const dashboardKeys = {
  all: ["dashboard"] as const,
  overview: (weekStart: string, date: string) => [...dashboardKeys.all, "overview", weekStart, date] as const,
  reservation: (id: number) => [...dashboardKeys.all, "reservation", id] as const,
};

export const reportKeys = {
  all: ["reports"] as const,
  overview: (filters: import("@/types/reports").ReportFilters) => [...reportKeys.all, "overview", filters] as const,
  revenue: (filters: import("@/types/reports").ReportFilters, groupBy: import("@/types/reports").ReportGrouping) => [...reportKeys.all, "revenue", filters, groupBy] as const,
  reservations: (filters: import("@/types/reports").ReportFilters) => [...reportKeys.all, "reservations", filters] as const,
  courtUtilization: (filters: import("@/types/reports").ReportFilters) => [...reportKeys.all, "court-utilization", filters] as const,
  popularTimes: (filters: import("@/types/reports").ReportFilters) => [...reportKeys.all, "popular-times", filters] as const,
  payments: (filters: import("@/types/reports").ReportFilters) => [...reportKeys.all, "payments", filters] as const,
  operations: (filters: import("@/types/reports").ReportFilters) => [...reportKeys.all, "operations", filters] as const,
};

export const historyKeys = {
  all: ["history"] as const,
  list: (filters: { page: number; search: string; status: string; source: string }) => [...historyKeys.all, "list", filters] as const,
  detail: (id: number) => [...historyKeys.all, "detail", id] as const,
};
