import type { Metadata } from "next";
import "./globals.css";
import "./phase2.css";
import "./phase3.css";
import { Footer } from "@/components/Footer";
import { SiteHeader } from "@/components/SiteHeader";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://uro-modern-prototype.vercel.app"),
  title: { default: `${SITE.shortName} — ${SITE.tagline}`, template: `%s | ${SITE.shortName}` },
  description: SITE.description,
  openGraph: { title: `${SITE.name} — ${SITE.tagline}`, description: SITE.description, type: "website" },
  twitter: { card: "summary_large_image", title: SITE.name, description: SITE.description },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SiteHeader /><main>{children}</main><Footer /><WhatsAppFloat /></body></html>;
}
