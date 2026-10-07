"use client";

import { useEffect, useState } from "react";

export default function LegalContents({
  sections
}: Readonly<{ sections: { id: string; title: string }[] }>) {
  const [current, setCurrent] = useState(sections[0]?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setCurrent(visible.target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    sections.forEach(({ id }) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav aria-label="On this page" className="lg:sticky lg:top-24 lg:self-start">
      <p className="text-sm font-medium">On this page</p>
      <ol className="mt-4 space-y-1 border-l border-line">
        {sections.map(({ id, title }) => (
          <li key={id}>
            <a
              href={`#${id}`}
              aria-current={id === current ? "location" : undefined}
              className={[
                "-ml-px block border-l py-1.5 pl-4 text-sm transition-colors",
                id === current
                  ? "border-lime font-medium text-ink"
                  : "border-transparent text-muted hover:text-ink"
              ].join(" ")}
            >
              {title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
