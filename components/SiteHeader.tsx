"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { NAV } from "@/lib/site";
import { Icon } from "./Icons";

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="site-header">
      <div className="nav-shell" style={{ width: "100%", padding: "0 clamp(14px, 2vw, 28px)" }}>
        <Link
          className="brand"
          href="/"
          aria-label="United Returnees Organisation home"
          style={{
            flex: "0 0 auto",
            width: "158px",
            height: "76px",
            display: "flex",
            alignItems: "center",
          }}
        >
          <span
            style={{
              width: "150px",
              height: "72px",
              display: "grid",
              placeItems: "center",
              background: "#fff",
              border: "1px solid rgba(18,63,45,.14)",
              borderRadius: "12px",
              boxShadow: "0 4px 18px rgba(10,47,34,.12)",
              overflow: "hidden",
              padding: "3px",
            }}
          >
            <Image
              src="/images/uro-logo-alt.webp"
              alt="United Returnees Organisation"
              width={255}
              height={144}
              priority
              sizes="150px"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </span>
        </Link>

        <button className="menu-button" onClick={() => setOpen((v) => !v)} aria-label="Toggle navigation" aria-expanded={open}>
          <Icon name="menu" />
        </button>

        <nav className={open ? "nav-links open" : "nav-links"}>
          {NAV.map(([label, href]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>{label}</Link>
          ))}
          <Link className="text-button" href="/login" onClick={() => setOpen(false)}>Member Login</Link>
          <Link className="button button-sm" href="/join" onClick={() => setOpen(false)}>Join URO</Link>
        </nav>
      </div>
    </header>
  );
}
