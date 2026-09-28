import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import clsx from "clsx";

type HeadingEntry = { level: number; text: string; element: HTMLElement };

const MAX_RAIL_MARKERS = 24;
const CONTEXT_RADIUS = 4;

const railWidths: Record<number, string> = { 1: "w-5", 2: "w-3.5", 3: "w-2.5" };

function scrollToHeading(element: HTMLElement) {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
}

function useHeadings(editor: Editor) {
  const [headings, setHeadings] = useState<HeadingEntry[]>([]);

  useEffect(() => {
    function refresh() {
      const elements = Array.from(editor.view.dom.querySelectorAll<HTMLElement>("h1, h2, h3"));
      setHeadings(elements.map((element) => ({ level: Number(element.tagName[1]), text: element.textContent || "Untitled", element })));
    }
    refresh();
    editor.on("update", refresh);
    window.addEventListener("resize", refresh);
    return () => {
      editor.off("update", refresh);
      window.removeEventListener("resize", refresh);
    };
  }, [editor]);

  return headings;
}

function useIsActive() {
  const [active, setActive] = useState(true);

  useEffect(() => {
    const container = document.getElementById("main-content");
    let timeout = setTimeout(() => setActive(false), 1200);
    if (!container) return () => clearTimeout(timeout);
    function onScroll() {
      setActive(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setActive(false), 1200);
    }
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      clearTimeout(timeout);
    };
  }, []);

  return active;
}

function useActiveIndex(headings: HeadingEntry[]) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const container = document.getElementById("main-content");
    if (!container) return;
    function onScroll() {
      if (!container) return;
      const containerTop = container.getBoundingClientRect().top;
      const offset = container.scrollTop + 80;
      let index = 0;
      for (let i = 0; i < headings.length; i++) {
        const top = headings[i].element.getBoundingClientRect().top - containerTop + container.scrollTop;
        if (top <= offset) index = i;
      }
      setActive(index);
    }
    onScroll();
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [headings]);

  return active;
}

function sampleHeadings(headings: HeadingEntry[]) {
  if (headings.length <= MAX_RAIL_MARKERS) return headings;

  return Array.from({ length: MAX_RAIL_MARKERS }, (_, index) => {
    const headingIndex = Math.round(
      (index * (headings.length - 1)) / (MAX_RAIL_MARKERS - 1),
    );
    return headings[headingIndex];
  });
}

function railHeadings(headings: HeadingEntry[]) {
  const majorHeadings = headings.filter((heading) => heading.level < 3);
  return sampleHeadings(majorHeadings.length >= 2 ? majorHeadings : headings);
}

function activeRailIndex(
  headings: HeadingEntry[],
  markers: HeadingEntry[],
  active: number,
) {
  let marker = 0;
  for (let index = 0; index < markers.length; index++) {
    if (headings.indexOf(markers[index]) > active) break;
    marker = index;
  }
  return marker;
}

export default function PageOutline({ editor }: Readonly<{ editor: Editor }>) {
  const headings = useHeadings(editor);
  const active = useActiveIndex(headings);
  const scrollActive = useIsActive();
  const [isOpen, setIsOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  if (headings.length < 2) return null;

  const markers = railHeadings(headings);
  const activeMarker = activeRailIndex(headings, markers, active);
  const contextHeadings = showAll
    ? headings
    : headings.slice(
        Math.max(0, active - CONTEXT_RADIUS),
        Math.min(headings.length, active + CONTEXT_RADIUS + 1),
      );

  return createPortal(
    <nav
      aria-label="Page outline"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsOpen(false);
      }}
      className={clsx(
        "fixed top-1/2 right-3 z-40 hidden -translate-y-1/2 transition-opacity duration-300 motion-reduce:transition-none sm:block",
        scrollActive || isOpen ? "opacity-100" : "opacity-0",
      )}
    >
      {isOpen && (
        <section
          aria-label="Section context"
          className={clsx(
            "absolute top-1/2 right-6 max-h-[70vh] w-72 -translate-y-1/2 overflow-y-auto rounded-lg",
            "border border-ink/15 bg-surface shadow-lg",
            "p-3",
          )}
        >
          <p className={clsx("text-xs font-medium text-muted")}>
            Section {active + 1} of {headings.length}
          </p>
          <p className={clsx("mt-1 truncate text-sm font-medium text-ink")}>
            {headings[active].text}
          </p>
          <ul className={clsx("mt-3 space-y-0.5 text-sm")}>
            {contextHeadings.map((heading) => {
              const index = headings.indexOf(heading);
              return (
                <li
                  key={heading.element.id || `${heading.text}-${index}`}
                  style={{ paddingLeft: `${(heading.level - 1) * 12}px` }}
                >
                  <button
                    type="button"
                    onClick={() => scrollToHeading(heading.element)}
                    aria-current={index === active ? "location" : undefined}
                    className={clsx(
                      "block w-full truncate rounded-md px-2 py-1.5 text-left",
                      index === active
                        ? "bg-ink/10 font-medium text-ink"
                        : "text-muted hover:bg-ink/5 hover:text-ink",
                    )}
                  >
                    {heading.text}
                  </button>
                </li>
              );
            })}
          </ul>
          {headings.length > contextHeadings.length && (
            <button
              type="button"
              onClick={() => setShowAll((visible) => !visible)}
              className={clsx(
                "mt-3 px-2 py-1 text-xs font-medium text-muted",
                "hover:text-ink",
              )}
            >
              {showAll ? "Show nearby sections" : `Show all ${headings.length} sections`}
            </button>
          )}
        </section>
      )}
      <div className={clsx("flex flex-col items-end gap-1.5")}>
        {markers.map((heading, index) => (
          <button
            key={heading.element.id || `${heading.text}-${index}`}
            type="button"
            onClick={() => scrollToHeading(heading.element)}
            aria-label={heading.text}
            aria-current={index === activeMarker ? "location" : undefined}
            className={clsx(
              "h-0.5 rounded-full transition-colors motion-reduce:transition-none",
              railWidths[heading.level] ?? "w-2.5",
              index === activeMarker
                ? "bg-ink"
                : "bg-ink/25 hover:bg-ink/50 focus-visible:bg-ink/50",
            )}
          />
        ))}
      </div>
    </nav>,
    document.body,
  );
}
