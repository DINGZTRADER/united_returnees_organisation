import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SectionHeading } from "@/components/SectionHeading";
import { SITE } from "@/lib/site";
import styles from "./about.module.css";

export const metadata: Metadata = {
  title: "About URO",
  description:
    "Learn about United Returnees Organisation and its work supporting Ugandan diaspora returnees through reintegration, community, livelihoods, entrepreneurship and productive investment.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About United Returnees Organisation",
    description: "A bridge from return to renewal for Ugandans coming home from the diaspora.",
    url: "/about",
    images: [
      {
        url: "/images/uro/pic5.webp",
        alt: "United Returnees Organisation members and visitors at a URO office",
      },
    ],
  },
};

export default function About() {
  return <>
    <section className="page-hero"><div className="container"><span className="eyebrow">About URO</span><h1>A bridge from return to renewal.</h1><p>United Returnees Organisation is focused on reintegration, empowerment and socio-economic transformation for Ugandans returning home from the diaspora.</p></div></section>
    <section className="section"><div className="container two-col balanced"><div><SectionHeading eyebrow="Our purpose" title="Helping returnees rebuild with dignity and direction"/><p>URO is developing practical programmes, partnerships and opportunities that help returnees settle comfortably, restore hope, establish sustainable livelihoods, pursue entrepreneurship and productive investment, and contribute meaningfully to Uganda&apos;s development.</p></div><div className={styles.collage} aria-label="URO community and institutional engagement"><figure className={styles.primary}><Image src="/images/uro/pic5.webp" alt="United Returnees Organisation members and visitors gathered at a URO office" fill sizes="(max-width: 900px) 100vw, 50vw" quality={92}/><figcaption>A growing community around Ugandans returning home</figcaption></figure><figure className={styles.secondary}><Image src="/images/uro/pic4.webp" alt="URO representative meeting a stakeholder in an office in Uganda" fill sizes="(max-width: 900px) 48vw, 22vw" quality={92}/></figure></div></div></section>
    <section className="section section-dark"><div className={`container ${styles.recognitionGrid}`}><div><SectionHeading eyebrow="Public recognition" title="Working within Uganda's wider diaspora ecosystem" text="The opening of the URO Secretariat in Kampala was officiated by Mohammed Bagonza, Head of the State House Diaspora Unit and Patron of URO. The State House Diaspora Unit publicly commended URO's work on reintegration, empowerment, livelihoods, entrepreneurship and productive investment."/><a className="button button-light" href={SITE.publicRecognitionUrl} target="_blank" rel="noreferrer">Read the official Diaspora Affairs report</a></div><figure className={styles.document}><Image src="/images/uro/pic1.webp" alt="State House correspondence shared with the Ugandan returnee network in February 2026" width={285} height={380} sizes="(max-width: 800px) 320px, 300px" quality={92}/><figcaption>State House correspondence shared with the returnee network, February 2026. The letter is shown as contextual material; the official public recognition reference is the Diaspora Affairs report linked alongside it.</figcaption></figure></div></section>
    <section className="section"><div className="container"><SectionHeading eyebrow="Leadership" title="Built around accountable leadership" text="URO's leadership brings together returnee experience, institutional engagement and practical support for Ugandans rebuilding at home."/><div className="leadership-grid"><article><div className="portrait-placeholder">ED</div><h3>Executive Director</h3><p>Denis Kalema</p></article><article className={styles.leaderCard}><Image className={styles.leaderPhoto} src="/images/uro/mohammed-bagonza.webp" alt="Mohammed Bagonza, Patron of United Returnees Organisation" width={300} height={375} sizes="(max-width: 700px) 100vw, (max-width: 980px) 50vw, 25vw" quality={90}/><h3>Patron</h3><p>Mohammed Bagonza</p></article><article className={styles.leaderCard}><Image className={styles.leaderPhoto} src="/images/uro/lydia-mwesigwa.webp" alt="Lydia Mwesigwa, President of United Returnees Organisation" width={300} height={375} sizes="(max-width: 700px) 100vw, (max-width: 980px) 50vw, 25vw" quality={90}/><h3>President</h3><p>Lydia Mwesigwa</p></article><article><div className="portrait-placeholder">B</div><h3>Board & Management</h3><p>Official directory coming soon</p></article></div><p className="fine-print">Executive Director name is based on URO-provided information and requires final spelling confirmation. Patron and President references are based on URO-provided information and public institutional reporting where available. The full Board directory remains subject to official confirmation.</p></div></section>
    <section className="section section-soft"><div className="container cta-row"><div><h2>Planning your return?</h2><p>Join the network before you arrive so you can prepare with better information and stronger local connections.</p></div><Link className="button" href="/join">Join URO</Link></div></section>
  </>;
}
