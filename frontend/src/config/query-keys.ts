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

export const policyKeys = {
  all: ["policies"] as const,
  public: () => [...policyKeys.all, "public"] as const,
  management: () => [...policyKeys.all, "management"] as const,
};

export const courtPricingKeys = {
  all: ["court-pricing"] as const,
  management: () => [...courtPricingKeys.all, "management"] as const,
  reservationOptions: (date: string) => [...courtPricingKeys.all, "reservation-options", date] as const,
};
