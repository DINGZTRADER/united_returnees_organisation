import type { Metadata } from "next";
import "./globals.css";
import "./phase2.css";
import "./phase3.css";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
import { UROConcierge } from "@/components/UROConcierge";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { SITE } from "@/lib/site";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://uro-modern-prototype.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE.shortName} — ${SITE.tagline}`, template: `%s | ${SITE.shortName}` },
  description: SITE.description,
  keywords: [
    "Uganda diaspora returnees",
    "returning to Uganda",
    "Uganda diaspora reintegration",
    "returnee support Uganda",
    "United Returnees Organisation",
    "URO Uganda",
  ],
  applicationName: SITE.name,
  category: "community",
  robots: { index: true, follow: true },
  openGraph: {
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.description,
    url: SITE_URL,
    siteName: SITE.name,
    locale: "en_UG",
    type: "website",
    images: [
      {
        url: "/images/uro/uro-team-office-hq.webp",
        alt: "United Returnees Organisation community gathering in Kampala, Uganda",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.name,
    description: SITE.description,
    images: ["/images/uro/uro-team-office-hq.webp"],
  },
};

const organisationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE.name,
  alternateName: SITE.shortName,
  url: SITE_URL,
  logo: `${SITE_URL}/images/uro-logo.png`,
  image: `${SITE_URL}/images/uro/uro-team-office-hq.webp`,
  description: SITE.description,
  areaServed: {
    "@type": "Country",
    name: "Uganda",
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Kampala",
    addressCountry: "UG",
  },
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+256750038345",
    contactType: "returnee support",
    areaServed: "UG",
    availableLanguage: "English",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organisationJsonLd) }} /><SiteHeader /><main>{children}</main><Footer /><div id="ask-uro"><UROConcierge /></div><WhatsAppFloat /></body></html>;
}
