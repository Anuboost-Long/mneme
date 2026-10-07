import Link from "next/link";

import LegalContents from "./LegalContents";
import Reveal from "./Reveal";
import SiteShell from "./SiteShell";

export type LegalSection = { title: string; paragraphs: string[] };

const documents = [
  ["Privacy notice", "/privacy"],
  ["Terms of use", "/terms"]
] as const;

export function sectionId(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function LegalPage({
  title,
  updated,
  summary,
  sections
}: Readonly<{ title: string; updated: string; summary: string; sections: LegalSection[] }>) {
  const other = documents.find(([label]) => label !== title) ?? documents[0];

  return (
    <SiteShell>
      <section className="relative overflow-hidden border-b border-line">
        <div
          aria-hidden
          className="dot-grid absolute inset-0 mask-[radial-gradient(ellipse_60%_90%_at_15%_20%,#000,transparent)]"
        />
        <div className="relative mx-auto max-w-7xl px-4 pt-12 pb-14 sm:px-6 lg:pt-16 lg:pb-20">
          <nav aria-label="Legal documents" className="inline-flex rounded-full border border-line bg-raised p-1">
            {documents.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                aria-current={label === title ? "page" : undefined}
                className={[
                  "rounded-full px-4 py-1.5 text-sm transition-colors",
                  label === title ? "bg-action font-medium text-on-action" : "text-muted hover:text-ink"
                ].join(" ")}
              >
                {label}
              </Link>
            ))}
          </nav>
          <Reveal immediate className="mt-10 max-w-3xl">
            <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight md:text-6xl">{title}</h1>
            <p className="mt-4 text-sm text-muted">Last updated {updated}</p>
            <p className="mt-8 max-w-[60ch] border-l-2 border-lime pl-5 text-lg leading-relaxed md:text-xl">
              {summary}
            </p>
          </Reveal>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,8fr)] lg:gap-16 lg:py-20">
        <LegalContents
          sections={sections.map((section) => ({ id: sectionId(section.title), title: section.title }))}
        />
        <article className="max-w-[68ch]">
          {sections.map((section, index) => (
            <section
              key={section.title}
              id={sectionId(section.title)}
              aria-labelledby={`${sectionId(section.title)}-title`}
              className="scroll-mt-24 border-t border-line py-9 first:border-t-0 first:pt-0"
            >
              <h2
                id={`${sectionId(section.title)}-title`}
                className="flex items-baseline gap-4 text-xl font-semibold tracking-tight md:text-2xl"
              >
                <span aria-hidden className="w-6 shrink-0 font-mono text-sm font-normal text-muted">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {section.title}
              </h2>
              <div className="mt-4 space-y-4 pl-10 leading-relaxed text-muted">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </section>
          ))}
          <p className="mt-6 border-t border-line pt-8 pl-10 text-muted">
            Also read the{" "}
            <Link href={other[1]} className="font-medium text-ink underline underline-offset-4">
              {other[0].toLowerCase()}
            </Link>
            .
          </p>
        </article>
      </div>
    </SiteShell>
  );
}
