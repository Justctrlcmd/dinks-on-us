/**
 * Temporary public-site content used while staff-managed site settings are not
 * connected. Keep unconfirmed details explicitly labelled as samples.
 */
export const mockPublicSite = {
  hero: {
    eyebrow: "Your home court in Bulacan",
    titleLines: ["Find Your Crew.", "Play Your Game.", "The Dinks Are on US!"],
    description:
      "An easygoing place to rally, recharge, and reserve a court with your favorite people.",
    image: "/images/pickleball-courts-hero.png",
    imageAlt: "Indoor pickleball courts ready for play",
  },
  etiquette: {
    eyebrow: "Court etiquette",
    title: "Good games start with good court energy.",
    description:
      "A few simple habits help every rally feel welcoming, safe, and fun for the whole community.",
    rules: [
      {
        title: "Wear proper attire",
        description: "Wear athletic clothing and non-marking court shoes so you can move comfortably and keep the courts safe.",
      },
      {
        title: "Keep score together",
        description: "Call the score clearly before every serve. If there is a question, settle it calmly with your group.",
      },
      {
        title: "Share the court",
        description: "Rotate fairly between games and make room for new players, regular crews, and every skill level.",
      },
      {
        title: "Respect the kitchen",
        description: "Give players room near the net and follow the non-volley zone rules during every rally.",
      },
      {
        title: "Play safe",
        description: "Stay aware of players, paddles, and loose balls around you. Call out early when something feels unsafe.",
      },
      {
        title: "Bring good energy",
        description: "Respect players, staff, equipment, and every guest. Great sportsmanship makes the whole court better.",
      },
    ],
  },
  booking: {
    eyebrow: "How booking works",
    title: "Less planning. More playing.",
    steps: [
      { title: "Find your slot", description: "Choose your date, then check live court availability for the times that work best for your crew." },
      { title: "Choose your play", description: "Select one or more one-hour slots. You can mix courts or choose non-consecutive times in one reservation." },
      { title: "Send payment", description: "Pick a configured e-wallet, upload your payment receipt, and add the reference number so staff can review it." },
      { title: "Get confirmed", description: "After staff verifies your payment, your reservation is confirmed and your selected court time is ready for play." },
    ],
  },
  about: {
    eyebrow: "About Dinks on Us",
    title: "Made for the love of the rally.",
    description:
      "Dinks on Us is a pickleball home in Bulacan where first-time players, regular crews, and everyone in between can share great court time.",
    statement: "Book a court. Bring your people. Build your community.",
  },
  gallery: {
    eyebrow: "Inside the courts",
    title: "A glimpse of your next game.",
    description:
      "These facility previews will be replaced by staff-managed gallery photos when the content system is connected.",
    images: [
      {
        src: "/images/pickleball-courts-hero.png",
        alt: "Wide preview of the indoor Dinks on Us court facility",
        label: "Three-court facility",
      },
      {
        src: "/images/pickleball-courts-hero.png",
        alt: "Court-side preview of an indoor pickleball court",
        label: "Court-side view",
      },
    ],
  },
  location: {
    eyebrow: "Location",
    title: "See you in Bulacan.",
    description:
      "Dinks on Us is located in Bulacan, Philippines. Staff will publish the final venue address, operating hours, and contact channels here.",
    detailLabel: "Preview venue details",
    detail: "Exact address and opening hours to be announced",
    mapQuery: "Bulacan, Philippines",
  },
} as const;
