"use client";

import { useEffect, useMemo, useState } from "react";
import type { BriefingItem } from "@/lib/briefing";
import styles from "./ReturneeBriefing.module.css";

function formatDate(value: string | null) {
  if (!value) return "Recently verified";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function ReturneeBriefing({ items }: { items: BriefingItem[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = items.length;

  const reducedMotion = useMemo(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    if (count < 2 || paused || reducedMotion) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, 6500);
    return () => window.clearInterval(timer);
  }, [count, paused, reducedMotion]);

  if (!count) return null;

  const previous = () => setIndex((current) => (current - 1 + count) % count);
  const next = () => setIndex((current) => (current + 1) % count);

  return (
    <section className={styles.section} aria-labelledby="returnee-briefing-title">
      <div className="container">
        <div className={styles.shell}>
          <div className={styles.flagLine} aria-hidden="true" />

          <header className={styles.header}>
            <div className={styles.heading}>
              <span className={styles.liveLabel}><i aria-hidden="true" />Returnee briefing</span>
              <h2 id="returnee-briefing-title">Uganda now. Opportunities worth watching.</h2>
              <p>Curated updates for Ugandans planning a return, rebuilding at home or looking for a practical route into work, enterprise and investment.</p>
            </div>

            <div className={styles.controls} aria-label="Returnee briefing controls">
              <button type="button" onClick={previous} aria-label="Previous briefing item">←</button>
              <span><strong>{String(index + 1).padStart(2, "0")}</strong> / {String(count).padStart(2, "0")}</span>
              <button type="button" onClick={next} aria-label="Next briefing item">→</button>
            </div>
          </header>

          <div
            className={styles.viewport}
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={() => setPaused(false)}
          >
            <div className={styles.track} style={{ transform: `translateX(-${index * 100}%)` }}>
              {items.map((item) => (
                <article className={styles.slide} key={item.id}>
                  <div className={styles.meta}>
                    <span className={`${styles.kind} ${item.kind === "opportunity" ? styles.opportunity : styles.news}`}>
                      {item.kind === "opportunity" ? "Opportunity" : "Uganda update"}
                    </span>
                    <span className={styles.category}>{item.category}</span>
                  </div>

                  <div className={styles.story}>
                    <div>
                      <span className={styles.source}>{item.source_name}</span>
                      <h3>{item.title}</h3>
                    </div>
                    <p>{item.summary}</p>
                  </div>

                  <footer className={styles.footer}>
                    <a href={item.source_url} target="_blank" rel="noreferrer">
                      {item.cta_label} <span aria-hidden="true">↗</span>
                    </a>
                    <time dateTime={item.published_at ?? item.verified_at}>{formatDate(item.published_at)}</time>
                  </footer>
                </article>
              ))}
            </div>
          </div>

          <div className={styles.bottomRow}>
            <div className={styles.dots} aria-label="Briefing slide selector">
              {items.map((item, itemIndex) => (
                <button
                  key={item.id}
                  type="button"
                  className={itemIndex === index ? styles.activeDot : ""}
                  onClick={() => setIndex(itemIndex)}
                  aria-label={`Show briefing item ${itemIndex + 1}`}
                  aria-current={itemIndex === index ? "true" : undefined}
                />
              ))}
            </div>
            <p>Curated from official and public sources. Always confirm eligibility, deadlines and terms at the source before acting.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
