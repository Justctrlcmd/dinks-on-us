import { icons } from "@/config/icons";

export const managementAreas = [
  {
    slug: "court-pricing",
    title: "Courts & Pricing",
    description: "Create courts and configure their rates, player limits, operating hours, and rentable equipment.",
    icon: icons.rates,
    capabilities: [
      "Create and maintain courts",
      "Set court rates, player limits, and operating hours",
      "Create rental equipment and set its pricing",
    ],
  },
  {
    slug: "close-date-slot",
    title: "Availability & Closures",
    description: "Select a court, then close the full date or only the affected time slots without disrupting active reservations.",
    icon: icons.blockedSlots,
    capabilities: ["Close an entire business date", "Block a selected court and time slot", "Review reservation conflicts before saving"],
  },
  {
    slug: "payment-method",
    title: "Payment Methods",
    description: "Add supported e-wallets with their QR image, display name, and account number.",
    icon: icons.payment,
    capabilities: ["Add and edit e-wallet details", "Upload or replace the QR image", "Activate or deactivate a payment method"],
  },
  {
    slug: "staff-accounts",
    title: "Team & Access",
    description: "Create staff roles and accounts, assign one role per account, and manage operational access.",
    icon: icons.staff,
    capabilities: ["Create and edit roles", "Create staff accounts and assign one role", "Activate or deactivate access"],
  },
  {
    slug: "rules-policy",
    title: "Rules & Policies",
    description: "Manage customer-facing court, reservation, reschedule, and cancellation policies.",
    icon: icons.rules,
    capabilities: [
      "Maintain the four system-defined policy sections",
      "Create, edit, move, or delete sub-headers and rules",
      "Drag content to change its public display order",
    ],
  },
  {
    slug: "events",
    title: "Events",
    description: "Create public events with a header, image, description, and date.",
    icon: icons.calendar,
    capabilities: ["Create and edit event details", "Upload an event image", "Publish, archive, or remove events"],
  },
  {
    slug: "gallery",
    title: "Gallery",
    description: "Add and organize public images in the appropriate gallery tabs.",
    icon: icons.gallery,
    capabilities: ["Create and manage gallery tabs", "Upload images to a selected tab", "Set image display order or remove images"],
  },
  {
    slug: "faqs",
    title: "FAQs",
    description: "Create question-and-answer cards for the public site and control the order in which players see them.",
    icon: icons.faq,
    capabilities: ["Create, edit, or delete Q&A cards", "Drag cards to change their public order", "Control public visibility"],
  },
] as const;

export type ManagementArea = (typeof managementAreas)[number];

export function getManagementArea(slug: string) {
  return managementAreas.find((area) => area.slug === slug);
}
