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
      <div
        className="nav-shell"
        style={{
          width: "100%",
          position: "relative",
          paddingLeft: "190px",
          paddingRight: "clamp(16px, 2.2vw, 32px)",
        }}
      >
        <Link
          className="brand"
          href="/"
          aria-label="United Returnees Organisation home"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "84px",
            width: "180px",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            zIndex: 2,
          }}
        >
          <Image
            src="/images/uro-logo.png"
            alt="United Returnees Organisation"
            width={188}
            height={82}
            priority
            style={{ width: "170px", height: "82px" }}
          />
        </Link>

        <button
          className="menu-button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle navigation"
          aria-expanded={open}
        >
          <Icon name="menu" />
        </button>

        <nav className={open ? "nav-links open" : "nav-links"}>
          {NAV.map(([label, href]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>
              {label}
            </Link>
          ))}
          <Link className="text-button" href="/login" onClick={() => setOpen(false)}>
            Member Login
          </Link>
          <Link className="button button-sm" href="/join" onClick={() => setOpen(false)}>
            Join URO
          </Link>
        </nav>
      </div>
    </header>
  );
}
