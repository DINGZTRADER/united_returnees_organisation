export function SectionHeading({ eyebrow, title, text, align = "left" }: { eyebrow?: string; title: string; text?: string; align?: "left" | "center" }) {
  return <div className={`section-heading ${align === "center" ? "center" : ""}`}>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{text && <p>{text}</p>}</div>;
}
