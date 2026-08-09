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
            minWidth: "250px",
            height: "76px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: "relative",
              flex: "0 0 118px",
              width: "118px",
              height: "68px",
              overflow: "hidden",
              background: "#fff",
              border: "1px solid rgba(18,63,45,.10)",
              borderRadius: "12px",
              boxShadow: "0 4px 18px rgba(10,47,34,.10)",
            }}
          >
            <Image
              src="/images/uro-logo.png"
              alt=""
              width={220}
              height={220}
              priority
              sizes="190px"
              style={{
                position: "absolute",
                width: "190px",
                height: "190px",
                maxWidth: "none",
                left: "50%",
                top: "46%",
                transform: "translate(-50%, -50%)",
                objectFit: "contain",
              }}
            />
          </span>
          <span style={{ display: "grid", lineHeight: 1.05 }}>
            <strong style={{ fontFamily: "Georgia, serif", fontSize: "1.35rem", color: "#123f2d", letterSpacing: ".02em" }}>URO</strong>
            <small style={{ marginTop: "4px", maxWidth: "128px", fontSize: ".66rem", lineHeight: 1.25, fontWeight: 800, color: "#56655d", textTransform: "uppercase", letterSpacing: ".06em" }}>
              United Returnees Organisation
            </small>
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
