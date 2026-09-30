"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const links = [
  ["Features", "/features"],
  ["How it works", "/workflow"],
  ["Privacy", "/privacy"]
] as const;

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="site-header border-b border-ink/15 bg-paper">
      <nav aria-label="Primary navigation" className="site-frame site-navigation">
        <Link href="/" className="site-brand">
          <Image src="/app-icon.svg" alt="" width={34} height={34} priority />
          Mneme
        </Link>
        <div className="site-links">
          {links.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </div>
        <div className="site-menu">
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="site-menu-links"
            onClick={() => setMenuOpen((open) => !open)}
          >
            Menu
          </button>
          <div
            id="site-menu-links"
            className={menuOpen ? "site-menu-panel open" : "site-menu-panel"}
          >
            {links.map(([label, href]) => (
              <Link key={href} href={href} onClick={() => setMenuOpen(false)}>
                {label}
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </header>
  );
}
