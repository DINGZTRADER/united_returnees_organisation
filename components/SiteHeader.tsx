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
            flex: "0 0 76px",
            width: "76px",
            height: "76px",
            display: "grid",
            placeItems: "center",
            background: "#fff",
            borderRadius: "14px",
            boxShadow: "0 4px 18px rgba(10,47,34,.10)",
          }}
        >
          <Image
            src="/images/uro-logo.png"
            alt="United Returnees Organisation"
            width={220}
            height={220}
            priority
            sizes="76px"
            style={{ width: "68px", height: "68px", objectFit: "contain" }}
          />
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
