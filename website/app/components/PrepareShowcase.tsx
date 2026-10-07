"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState, type ReactNode } from "react";

const outputs = [
  {
    id: "summary",
    label: "Summary",
    detail: "The whole module in a few paragraphs, with its key topics."
  },
  {
    id: "notes",
    label: "Revision notes",
    detail: "Each topic’s terms, definitions and key points, linked to the pages they come from."
  },
  {
    id: "flashcards",
    label: "Flashcards",
    detail: "Cards for every page, shown again just before you’d forget them."
  },
  {
    id: "quiz",
    label: "Practice quiz",
    detail: "Questions tagged by topic, so you see which ones need more work."
  }
] as const;

type Output = (typeof outputs)[number]["id"];

export default function PrepareShowcase({ shots }: Readonly<{ shots: Record<Output, ReactNode> }>) {
  const [active, setActive] = useState<Output>("summary");
  const reduce = useReducedMotion();

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:gap-12">
      <div role="tablist" aria-label="What Prepare module makes" className="flex flex-col gap-1">
        {outputs.map((output) => {
          const selected = output.id === active;
          return (
            <button
              key={output.id}
              type="button"
              role="tab"
              id={`prepare-tab-${output.id}`}
              aria-selected={selected}
              aria-controls="prepare-panel"
              onClick={() => setActive(output.id)}
              className={[
                "rounded-xl border px-5 py-4 text-left transition-colors",
                selected ? "border-line bg-raised" : "border-transparent hover:bg-raised/60"
              ].join(" ")}
            >
              <span className="flex items-center gap-3 text-lg font-medium">
                <span
                  aria-hidden="true"
                  className={[
                    "size-2.5 rounded-full transition-colors",
                    selected ? "bg-lime" : "bg-line"
                  ].join(" ")}
                />
                {output.label}
              </span>
              <span className="mt-1 block pl-5.5 text-sm leading-6 text-muted">{output.detail}</span>
            </button>
          );
        })}
      </div>
      <div
        id="prepare-panel"
        role="tabpanel"
        aria-labelledby={`prepare-tab-${active}`}
        className="grid"
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={active}
            className="[grid-area:1/1]"
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            {shots[active]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
