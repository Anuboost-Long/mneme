import type { ReactNode } from "react";

import SiteShell from "./SiteShell";

export default function LegalPage({
  title,
  updated,
  children
}: Readonly<{ title: string; updated: string; children: ReactNode }>) {
  return (
    <SiteShell>
      <article className="legal-page">
        <header>
          <p>Mneme legal</p>
          <h1>{title}</h1>
          <span>Last updated {updated}</span>
        </header>
        <div className="legal-content">{children}</div>
      </article>
    </SiteShell>
  );
}
