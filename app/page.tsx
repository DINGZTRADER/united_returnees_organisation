import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { ReturneeBriefing } from "@/components/ReturneeBriefing";
import { SectionHeading } from "@/components/SectionHeading";
import { getBriefingItems } from "@/lib/briefing";
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
        url: "/images/uro/uro-team-office-hq.webp",
        alt: "United Returnees Organisation community gathering in Kampala, Uganda",
      },
    ],
  },
};

const URO_MOMENTS = [
  {
    src: "/images/uro/pic2.webp",
    alt: "URO representatives during an institutional visit at a migrant workers support centre in Uganda",
    eyebrow: "Institutional engagement",
    label: "Connecting returnee support with public-service pathways",
    description: "URO engages with institutions working on migrant-worker, returnee and reintegration needs.",
    className: galleryStyles.standard,
    sizes: "(max-width: 680px) 100vw, (max-width: 980px) 50vw, 320px",
  },
  {
    src: "/images/uro/pic3.webp",
    alt: "URO representative during a stakeholder meeting in Uganda",
    eyebrow: "Stakeholder relations",
    label: "Building working relationships around reintegration",
    description: "Direct stakeholder conversations can strengthen referrals, local knowledge and practical support for returnees.",
    className: galleryStyles.standard,
    sizes: "(max-width: 680px) 100vw, (max-width: 980px) 50vw, 320px",
  },
  {
    src: "/images/uro/pic4.webp",
    alt: "URO representative meeting a stakeholder in an office in Uganda",
    eyebrow: "Partnership building",
    label: "Turning introductions into practical referral pathways",
    description: "URO is building relationships that can help returnees reach relevant services and institutional contacts.",
    className: galleryStyles.portrait,
    sizes: "(max-width: 680px) 100vw, (max-width: 980px) 50vw, 320px",
  },
  {
    src: "/images/uro/pic5.webp",
    alt: "United Returnees Organisation members and visitors gathered at a URO office",
    eyebrow: "Community",
    label: "A growing network around Ugandans returning home",
    description: "Members and visitors connect around shared experience, reintegration and rebuilding in Uganda.",
    className: galleryStyles.portrait,
    sizes: "(max-width: 680px) 100vw, (max-width: 980px) 50vw, 320px",
  },
  {
    src: "/images/uro/uro-team-office-hq.webp",
    alt: "United Returnees Organisation community members gathered at the URO office in Kampala",
    eyebrow: "Returnee community",
    label: "Practical conversations, local knowledge and support",
    description: "URO brings people together to make the return journey less isolated and more informed.",
    className: galleryStyles.standard,
    sizes: "(max-width: 680px) 100vw, (max-width: 980px) 50vw, 320px",
  },
] as const;

export default async function Home() {
  const briefingItems = await getBriefingItems();

  return (
    <>
      <section className={heroStyles.hero}>
        <div className={`container ${heroStyles.heroGrid}`}>
          <div className={heroStyles.content}>
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

          <div className={heroStyles.visual}>
            <Image
              src="/images/uro/uro-team-office-hq.webp"
              alt="United Returnees Organisation community members gathered at the URO office in Kampala"
              width={800}
              height={600}
              priority
              fetchPriority="high"
              sizes="(max-width: 980px) 100vw, 620px"
              quality={100}
            />
            <div className={heroStyles.visualNote}>
              <span>United Returnees Organisation</span>
              <span>Kampala · Uganda</span>
            </div>
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

      <ReturneeBriefing items={briefingItems} />

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

      <section className={galleryStyles.section} aria-labelledby="uro-in-action-title">
        <div className="container">
          <div className={galleryStyles.header}>
            <div>
              <span className="eyebrow">URO in action</span>
              <h2 id="uro-in-action-title">Building the relationships returnees need.</h2>
            </div>
            <p>URO&apos;s work depends on human connection: listening to returnees, engaging institutions, strengthening referral pathways and building a practical network around the return journey.</p>
          </div>

          <div className={galleryStyles.grid}>
            {URO_MOMENTS.map((moment) => (
              <figure className={`${galleryStyles.card} ${moment.className}`} key={moment.src}>
                <Image
                  src={moment.src}
                  alt={moment.alt}
                  fill
                  sizes={moment.sizes}
                  quality={90}
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
