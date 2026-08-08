import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { SectionHeading } from "@/components/SectionHeading";
import { READINESS, SITE, SUPPORT_PATHWAYS } from "@/lib/site";
import galleryStyles from "./home-gallery.module.css";
import heroStyles from "./home-hero.module.css";

export const metadata: Metadata = {
  title: "Uganda Diaspora Returnee Support",
  description:
    "United Returnees Organisation helps Ugandans planning to return or already back home access reintegration support, community, employment, business and investment pathways.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "United Returnees Organisation — Return. Reconnect. Rebuild.",
    description:
      "Practical reintegration support and community for Ugandans returning home from the diaspora.",
    url: "/",
    images: [
      {
        url: "/images/uro/uro-team-office.webp",
        alt: "United Returnees Organisation members and partners gathered in Kampala",
      },
    ],
  },
};

const URO_MOMENTS = [
  {
    src: "/images/uro/uro-community-meeting.webp",
    alt: "United Returnees Organisation members taking part in a community meeting in Uganda",
    eyebrow: "Community",
    label: "Conversations that make returning less isolating",
    description: "Returnees connect, exchange experience and build trusted local relationships.",
    className: galleryStyles.feature,
    sizes: "(max-width: 680px) 100vw, (max-width: 980px) 100vw, 58vw",
  },
  {
    src: "/images/uro/uro-office-visit.webp",
    alt: "Two URO community members meeting at the organisation office in Kampala",
    eyebrow: "Connection",
    label: "Practical support starts with listening",
    description: "One-to-one conversations help URO understand each return journey more clearly.",
    className: galleryStyles.portrait,
    sizes: "(max-width: 680px) 100vw, (max-width: 980px) 50vw, 40vw",
  },
  {
    src: "/images/uro/uro-returnee-team.webp",
    alt: "United Returnees Organisation team members wearing URO branded vests",
    eyebrow: "Outreach",
    label: "Visible in the community",
    description: "Building awareness, trust and pathways for Ugandans coming home.",
    className: galleryStyles.standard,
    sizes: "(max-width: 680px) 100vw, (max-width: 980px) 50vw, 33vw",
  },
  {
    src: "/images/uro/uro-office-discussion.webp",
    alt: "URO members discussing returnee support at an office desk",
    eyebrow: "Support",
    label: "Turning questions into next steps",
    description: "Practical discussions around settlement, opportunity and reintegration.",
    className: galleryStyles.standard,
    sizes: "(max-width: 680px) 100vw, (max-width: 980px) 50vw, 33vw",
  },
  {
    src: "/images/uro/uro-ribbon-cutting.webp",
    alt: "Ribbon-cutting at a United Returnees Organisation gathering in Kampala, Uganda",
    eyebrow: "Milestones",
    label: "A growing organisation for returnees",
    description: "Building a stronger platform for Ugandans returning from across the diaspora.",
    className: galleryStyles.standard,
    sizes: "(max-width: 680px) 100vw, (max-width: 980px) 50vw, 33vw",
  },
] as const;

export default function Home() {
  return (
    <>
      <section className={heroStyles.hero}>
        <Image
          className={heroStyles.image}
          src="/images/uro/uro-team-office.webp"
          alt="United Returnees Organisation members and partners gathered at the URO office in Kampala"
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          quality={95}
        />
        <div className={heroStyles.overlay} />

        <div className={`container ${heroStyles.content}`}>
          <span className={heroStyles.kicker}>For Ugandans planning to return — and those already home</span>
          <h1>Every return deserves a new beginning.</h1>
          <p>
            URO connects Ugandans returning from the diaspora with trusted information,
            practical support, opportunity and a community that understands the journey.
          </p>

          <div className={heroStyles.actions}>
            <Link className={`button ${heroStyles.primary}`} href="/join">
              Join URO — $100/year <Icon name="arrow" size={18} />
            </Link>
            <Link className={heroStyles.secondary} href="/contact">I need returnee support</Link>
          </div>

          <div className={heroStyles.proof} aria-label="URO member pathways">
            <span>Planning to return</span>
            <span>Recently returned</span>
            <span>Rebuilding in Uganda</span>
          </div>
        </div>

        <div className={heroStyles.strip}>
          <div className={`container ${heroStyles.stripInner}`}>
            <div><strong>Return.</strong><span>Prepare for coming home with better information.</span></div>
            <div><strong>Reconnect.</strong><span>Build trusted local relationships and community.</span></div>
            <div><strong>Rebuild.</strong><span>Move toward work, enterprise and productive investment.</span></div>
          </div>
        </div>
      </section>

      <section className="section intro-section">
        <div className="container two-col">
          <div><span className="eyebrow">United Returnees Organisation</span><h2>Coming home should not mean starting alone.</h2></div>
          <div>
            <p className="lead">URO is building a structured membership platform for Ugandans returning from the diaspora — whether you are preparing your move, looking for work, starting a business, investing or rebuilding after an unexpected return.</p>
            <p>Our role is to help returnees navigate Uganda with better information, stronger connections and practical pathways into productive life.</p>
          </div>
        </div>
      </section>

      <section className="section section-soft">
        <div className="container">
          <SectionHeading eyebrow="How URO helps" title="Support for the realities of returning home" text="Practical pathways designed around the decisions returnees actually face." align="center" />
          <div className="card-grid">
            {SUPPORT_PATHWAYS.map((item) => (
              <article className="support-card" key={item.title}>
                <div className="icon-box"><Icon name={item.icon} /></div>
                <h3>{item.title}</h3><p>{item.text}</p>
                <Link href="/services">Explore support <Icon name="arrow" size={16} /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section readiness">
        <div className="container">
          <div className="readiness-head">
            <SectionHeading eyebrow="Returnee Readiness" title="Plan before you commit." text="A disciplined return starts with understanding the people, institutions, risks and opportunities around your plan." />
            <Link className="text-link" href="/resources">Open the Returnee Guide <Icon name="arrow" size={17} /></Link>
          </div>
          <div className="steps">
            {READINESS.map((r) => <article key={r.step}><span>{r.step}</span><h3>{r.title}</h3><p>{r.text}</p></article>)}
          </div>
        </div>
      </section>

      <section className="photo-story">
        <div className="photo-panel">
          <Image
            src="/images/uro/uro-team-outdoors.webp"
            alt="URO members and partners gathered outdoors in Uganda"
            fill
            sizes="(max-width: 820px) 100vw, 58vw"
            quality={92}
          />
        </div>
        <div className="story-panel">
          <span className="eyebrow">A community that understands</span>
          <h2>Your experience abroad is not lost. It can become part of Uganda&apos;s future.</h2>
          <p>URO exists to help returnees rebuild sustainable livelihoods, pursue entrepreneurship and productive investment, reconnect professionally and contribute meaningfully to Uganda&apos;s development.</p>
          <Link className="button button-light" href="/about">About URO</Link>
        </div>
      </section>

      <section className={galleryStyles.section} aria-labelledby="uro-in-action-title">
        <div className="container">
          <div className={galleryStyles.header}>
            <div>
              <span className="eyebrow">URO in action</span>
              <h2 id="uro-in-action-title">Real people. Real return journeys.</h2>
            </div>
            <p>URO is built around human connection: listening, orientation, practical conversations and a growing network for Ugandans returning home.</p>
          </div>

          <div className={galleryStyles.grid}>
            {URO_MOMENTS.map((moment) => (
              <figure className={`${galleryStyles.card} ${moment.className}`} key={moment.src}>
                <Image
                  src={moment.src}
                  alt={moment.alt}
                  fill
                  sizes={moment.sizes}
                  quality={92}
                />
                <figcaption>
                  <span className={galleryStyles.captionEyebrow}>{moment.eyebrow}</span>
                  <strong>{moment.label}</strong>
                  <small>{moment.description}</small>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="section membership-cta">
        <div className="container membership-box">
          <div>
            <span className="eyebrow">URO Membership</span>
            <h2>Build your next chapter with a network behind you.</h2>
            <p>Membership is open to Ugandans abroad planning to return and Ugandans who have already returned home.</p>
            <ul className="feature-list">
              <li><Icon name="check" />Personal returnee profile</li>
              <li><Icon name="check" />Member resources and opportunities</li>
              <li><Icon name="check" />Support requests and referrals</li>
              <li><Icon name="check" />Events, networking and community</li>
            </ul>
          </div>
          <div className="price-card">
            <span>Annual membership</span><strong>${SITE.annualFeeUsd}</strong><small>USD / year</small>
            <Link className="button" href="/join">Start membership</Link>
            <Link className="text-link" href="/login">Already a member? Sign in</Link>
          </div>
        </div>
      </section>
    </>
  );
}
