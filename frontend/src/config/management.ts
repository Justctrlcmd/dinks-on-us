import { icons } from "@/config/icons";

export const managementAreas = [
  {
    slug: "rates",
    title: "Rates & Pricing",
    description: "Configure one-hour court rates, time ranges, day coverage, and active pricing.",
    icon: icons.rates,
    capabilities: ["Create and update rates", "Set time and day coverage", "Activate or deactivate pricing"],
  },
  {
    slug: "payment-methods",
    title: "Payment Methods",
    description: "Maintain payment instructions, account details, QR codes, and availability.",
    icon: icons.payment,
    capabilities: ["Add payment methods", "Replace QR code images", "Activate or deactivate methods"],
  },
  {
    slug: "events",
    title: "Events",
    description: "Create, publish, archive, and maintain events shown on the public website.",
    icon: icons.calendar,
    capabilities: ["Create event content", "Control publication status", "Maintain public event details"],
  },
  {
    slug: "staff",
    title: "Staff Accounts",
    description: "Create staff accounts, assign one role, and manage account access.",
    icon: icons.staff,
    capabilities: ["Create staff accounts", "Assign a role", "Activate or deactivate access"],
  },
  {
    slug: "roles",
    title: "Roles",
    description: "Define reusable staff roles and their module-level access.",
    icon: icons.roles,
    capabilities: ["Create and rename roles", "Assign module access", "Review assigned staff"],
  },
  {
    slug: "gallery",
    title: "Gallery",
    description: "Manage the approved images presented on the public website.",
    icon: icons.gallery,
    capabilities: ["Upload gallery images", "Set display order", "Remove outdated images"],
  },
  {
    slug: "rules",
    title: "Court Rules",
    description: "Maintain court etiquette, business policies, and their public display order.",
    icon: icons.rules,
    capabilities: ["Create and update rules", "Set display order", "Activate or deactivate rules"],
  },
  {
    slug: "closed-dates",
    title: "Closed Dates",
    description: "Close an entire business date without silently invalidating reservations.",
    icon: icons.calendar,
    capabilities: ["Schedule full-date closures", "Record closure reasons", "Review reservation conflicts"],
  },
  {
    slug: "blocked-slots",
    title: "Blocked Slots",
    description: "Block a specific court and time range for maintenance or operations.",
    icon: icons.blockedSlots,
    capabilities: ["Choose court and time range", "Record an internal reason", "Review booking conflicts"],
  },
  {
    slug: "faqs",
    title: "FAQ",
    description: "Maintain frequently asked questions shown to players on the public site.",
    icon: icons.faq,
    capabilities: ["Create questions and answers", "Set display order", "Control public visibility"],
  },
  {
    slug: "site-settings",
    title: "Website Settings",
    description: "Manage supported public business information without arbitrary configuration keys.",
    icon: icons.site,
    capabilities: ["Update contact details", "Maintain operating information", "Manage supported social links"],
  },
] as const;

export type ManagementArea = (typeof managementAreas)[number];

export function getManagementArea(slug: string) {
  return managementAreas.find((area) => area.slug === slug);
}
