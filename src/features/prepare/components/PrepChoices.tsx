import type { Page } from "@/features/courses/lib/page/types";
import { BodyText, Caption, Typography } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useState, type SubmitEvent } from "react";

import type { ModulePrep, PrepOutput } from "../lib/prep/types";
import { estimateRuns } from "../lib/prepareJob";

function cardsDetail(cardPages: number) {
  if (cardPages === 0) return "Every page already has flashcards.";
  return cardPages === 1
    ? "For the page with none yet."
    : "For the " + cardPages + " pages with none yet.";
}

function runsLine(outputs: PrepOutput[], runs: number) {
  if (!outputs.length) return "Choose at least one thing to make.";
  return `About ${runs} agent ${runs === 1 ? "run" : "runs"}. Pictures and recordings are read on this Mac.`;
}

type Choice = { output: PrepOutput; label: string; detail: string; disabled?: boolean };

function choices(prep: ModulePrep | null, hasQuiz: boolean, cardPages: number): Choice[] {
  return [
    {
      output: "summary",
      label: "Summary",
      detail: prep?.summary_page_id
        ? "Replaces the module’s summary page."
        : "A Summary page at the top of the module."
    },
    {
      output: "notes",
      label: "Revision notes",
      detail: prep?.notes_page_id
        ? "Replaces the revision notes page."
        : "Each key topic’s terms, definitions and key points, with the pages they come from."
    },
    {
      output: "flashcards",
      label: "Flashcards",
      detail: cardsDetail(cardPages),
      disabled: cardPages === 0
    },
    {
      output: "quiz",
      label: "Practice quiz",
      detail: hasQuiz
        ? "10 questions by topic. Replaces the current practice quiz."
        : "10 questions, tagged by topic."
    }
  ];
}

export default function PrepChoices({
  pages,
  prep,
  hasQuiz,
  cardPages,
  condensed,
  onPrepare
}: Readonly<{
  pages: Page[];
  prep: ModulePrep | null;
  hasQuiz: boolean;
  cardPages: number;
  condensed: Set<number>;
  onPrepare: (outputs: PrepOutput[]) => void;
}>) {
  const options = choices(prep, hasQuiz, cardPages);
  const [chosen, setChosen] = useState<PrepOutput[]>(["summary", "notes", "flashcards", "quiz"]);
  const outputs = options
    .filter((option) => !option.disabled && chosen.includes(option.output))
    .map((option) => option.output);
  const runs = estimateRuns(pages, outputs, cardPages, condensed);

  function toggle(output: PrepOutput) {
    setChosen((current) =>
      current.includes(output) ? current.filter((item) => item !== output) : [...current, output]
    );
  }

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (outputs.length) onPrepare(outputs);
  }

  return (
    <form onSubmit={submit} className={clsx("mt-6 border-t border-ink/10 pt-5")}>
      <fieldset>
        <legend>
          <Typography as="span" variant="label">
            What to make
          </Typography>
        </legend>
        <ul className={clsx("mt-2 divide-y divide-ink/10")}>
          {options.map((option) => (
            <li
              key={option.output}
              className={clsx("flex items-start gap-3 py-3", option.disabled && "opacity-60")}
            >
              <input
                id={`prep-${option.output}`}
                type="checkbox"
                aria-describedby={`prep-${option.output}-detail`}
                checked={!option.disabled && chosen.includes(option.output)}
                disabled={option.disabled}
                onChange={() => toggle(option.output)}
                className={clsx("mt-1 accent-current")}
              />
              <div className={clsx("min-w-0")}>
                <label
                  htmlFor={`prep-${option.output}`}
                  className={clsx(
                    "block text-sm font-medium",
                    !option.disabled && "cursor-pointer"
                  )}
                >
                  {option.label}
                </label>
                <Caption id={`prep-${option.output}-detail`} tone="muted" className={clsx("block")}>
                  {option.detail}
                </Caption>
              </div>
            </li>
          ))}
        </ul>
      </fieldset>
      <div
        className={clsx(
          "mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-ink/10 pt-4"
        )}
      >
        <BodyText tone="muted">{runsLine(outputs, runs)}</BodyText>
        <button
          type="submit"
          disabled={!outputs.length}
          className={clsx(
            "rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action",
            "hover:bg-action/85 disabled:opacity-50"
          )}
        >
          Prepare module
        </button>
      </div>
    </form>
  );
}
