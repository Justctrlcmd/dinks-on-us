import { headers } from "next/headers";
import { siteConfig } from "@/config/site";

export async function LocalBusinessJsonLd() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const data = {
    "@context": "https://schema.org",
    "@type": ["SportsActivityLocation", "LocalBusiness"],
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    logo: `${siteConfig.url}/images/dinks-brand.png`,
    image: `${siteConfig.url}/images/dinks-hero.png`,
    telephone: siteConfig.phone,
    email: siteConfig.email,
    address: {
      "@type": "PostalAddress",
      ...siteConfig.address,
    },
    sameAs: [siteConfig.facebookUrl, siteConfig.instagramUrl],
  };

  return <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
