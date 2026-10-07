import Image from "next/image";
import Link from "next/link";

import { navLinks } from "../lib/site";

export default function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 px-4 py-12 sm:flex-row sm:items-end sm:px-6">
        <div>
          <Link href="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
            <Image src="/app-icon.svg" alt="" width={30} height={30} />
            mneme
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-6 text-muted">
            Your courses, notes and revision in one app on your Mac.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-muted">
          {[...navLinks, ["Terms", "/terms"] as const].map(([label, href]) => (
            <Link key={href} href={href} className="transition-colors hover:text-ink">
              {label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
