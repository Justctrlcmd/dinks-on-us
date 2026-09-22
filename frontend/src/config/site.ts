export const siteConfig = {
  name: "Dinks on Us",
  description: "Your home court for pickleball, good energy, and community in Bulacan.",
  url: (process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000").replace(/\/$/, ""),
  locale: "en_PH",
  phone: "+639062932366",
  email: "dinksonusph@gmail.com",
  address: {
    streetAddress: "Sta. Lucia, in front of Boss Gasoline Station",
    addressLocality: "Angat",
    addressRegion: "Bulacan",
    addressCountry: "PH",
  },
  facebookUrl: "https://www.facebook.com/dinksonus",
  instagramUrl: "https://www.instagram.com/dinksonusph?stkn=NDdxb2xrODR4dDhv",
  messengerUrl: "https://www.facebook.com/dinksonus",
} as const;
