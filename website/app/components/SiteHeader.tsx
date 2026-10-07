"use client";

import { ListIcon, XIcon } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { navLinks } from "../lib/site";
import DownloadButton from "./DownloadButton";

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur-md">
      <nav
        aria-label="Primary navigation"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6"
      >
        <Link href="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
          <Image src="/app-icon.svg" alt="" width={30} height={30} priority />
          mneme
        </Link>
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="text-sm text-muted transition-colors hover:text-ink"
            >
              {label}
            </Link>
          ))}
          <DownloadButton size="sm" />
        </div>
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded-lg md:hidden"
          aria-expanded={menuOpen}
          aria-controls="site-menu"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <XIcon className="size-5" /> : <ListIcon className="size-5" />}
        </button>
      </nav>
      {menuOpen && (
        <div id="site-menu" className="border-t border-line px-4 pt-2 pb-5 md:hidden">
          {navLinks.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="block py-3 text-base"
            >
              {label}
            </Link>
          ))}
          <div className="mt-3">
            <DownloadButton />
          </div>
        </div>
      )}
    </header>
  );
}
