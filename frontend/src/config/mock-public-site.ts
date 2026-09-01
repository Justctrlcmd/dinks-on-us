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
    image: "/images/dinks-hero.png",
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
  reservation: {
    eyebrow: "How reservations work",
    title: "Less planning. More playing.",
    steps: [
      { title: "Choose a date and time", description: "Pick an open date and select one or more available court time slots. All slots in one reservation use the same date." },
      { title: "Add players / equipment", description: "Set your additional player count, optionally rent available equipment, and review the live total before continuing." },
      { title: "Complete checkout", description: "Enter your contact details, choose an e-wallet or bank method, upload your receipt, add the reference number, and accept the policies." },
      { title: "Wait for verification", description: "Your selected slots are held while staff verifies your payment. Once approved, your reservation is confirmed and ready for play." },
    ],
  },
  about: {
    eyebrow: "About Dinks on Us",
    title: "Made for the love of the rally.",
    description:
      "Dinks on Us is a pickleball home in Bulacan where first-time players, regular crews, and everyone in between can share great court time.",
    statement: "Reserve a court. Bring your people. Build your community.",
  },
  gallery: {
    eyebrow: "Inside the courts",
    title: "A glimpse of your next game.",
    description: "Explore the spaces, equipment, and court-side moments that make Dinks on Us feel like home.",
  },
  location: {
    eyebrow: "Location",
    title: "See you at Dinks on Us PH - Sports Center.",
    description:
      "Dinks on Us PH - Sports Center is located in Sta. Lucia, Angat, Bulacan, Philippines, in front of Boss Gasoline Station.",
    detailLabel: "Dinks on Us PH - Sports Center",
    detail: "Sta. Lucia, Angat, Bulacan • In front of Boss Gasoline Station",
    mapEmbedUrl:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3854.8765176276224!2d121.02628279999999!3d14.943971399999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397073afa464c81%3A0x7e894d289085de7a!2sDinks%20on%20Us%20PH%20-%20Sports%20Center!5e0!3m2!1sen!2sph!4v1788256731625!5m2!1sen!2sph",
    mapUrl: "https://maps.app.goo.gl/gj9q4epVo6NDSALu8?g_st=ic",
  },
} as const;
