import type { Course } from "@/features/courses/lib/course/types";
import type { Module } from "@/features/courses/lib/module/types";
import ModuleSubpageHeader from "@/features/courses/components/ModuleSubpageHeader";
import DeckMissing from "@/features/flashcards/components/DeckMissing";
import { deckCounts, reviewCard } from "@/features/flashcards/lib/card/actions";
import type { Flashcard } from "@/features/flashcards/lib/card/types";
import {
  describeInterval,
  Grade,
  gradeLabels,
  grades,
  nextSchedule
} from "@/features/flashcards/lib/schedule";
import { errorMessage } from "@/shared/lib/errorMessage";
import { BodyText, Caption, PageTitle, SectionTitle } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const gradeKeys: Record<string, Grade> = {
  "1": Grade.Again,
  "2": Grade.Hard,
  "3": Grade.Good,
  "4": Grade.Easy
};

export default function FlashcardReviewPage({
  course,
  module,
  cards,
  ready
}: Readonly<{
  course: Course | undefined;
  module: Module | undefined;
  cards: Flashcard[];
  ready: boolean;
}>) {
  const [queue, setQueue] = useState<Flashcard[] | null>(null);
  const [answerShown, setAnswerShown] = useState(false);
  const [tally, setTally] = useState({ right: 0, wrong: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const card = queue?.[0];

  useEffect(() => {
    if (!ready || queue) return;
    const today = new Date().toISOString().replace("T", " ").slice(0, 19);
    setQueue(
      cards
        .filter((item) => item.due_at <= today)
        .sort(
          (a, b) =>
            Number(a.last_reviewed_at === null) - Number(b.last_reviewed_at === null) ||
            a.due_at.localeCompare(b.due_at)
        )
    );
  }, [ready, cards, queue]);

  async function grade(chosen: Grade) {
    if (!card || busy) return;
    setBusy(true);
    setError("");
    try {
      const schedule = await reviewCard(card, chosen);
      const reviewed = { ...card, ...schedule, last_reviewed_at: "now" };
      setTally((current) =>
        chosen === Grade.Again
          ? { ...current, wrong: current.wrong + 1 }
          : { ...current, right: current.right + 1 }
      );
      setQueue((current) => {
        const rest = (current ?? []).slice(1);
        return chosen === Grade.Again ? [...rest, reviewed] : rest;
      });
      setAnswerShown(false);
    } catch (error_) {
      setError(errorMessage(error_, "Couldn’t save your answer. Try again."));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!card || event.metaKey || event.ctrlKey || event.altKey) return;
      if (
        event.target instanceof HTMLElement &&
        event.target.closest("input, textarea, [contenteditable=true]")
      )
        return;
      if (!answerShown && (event.key === " " || event.key === "Enter")) {
        event.preventDefault();
        setAnswerShown(true);
      } else if (answerShown && gradeKeys[event.key]) {
        event.preventDefault();
        void grade(gradeKeys[event.key]);
      }
    }
    globalThis.addEventListener("keydown", onKey);
    return () => globalThis.removeEventListener("keydown", onKey);
  });

  if (!course || !module) return <DeckMissing ready={ready} />;

  const deck = `/courses/${course.id}/modules/${module.id}/flashcards`;
  const reviewedCount = tally.right + tally.wrong;

  return (
    <div className={clsx("px-4 py-5 sm:px-6")}>
      <ModuleSubpageHeader
        course={course}
        module={module}
        trail={[{ label: "Flashcards", to: `/courses/${course.id}/modules/${module.id}/flashcards` }, { label: "Study" }]}
      />
      <div className={clsx("mt-6 flex items-baseline justify-between gap-4")}>
        <PageTitle className={clsx("min-w-0 wrap-anywhere")}>{module.name}</PageTitle>
        {card && (
          <Caption role="status" tone="muted" className={clsx("shrink-0")}>
            {queue?.length} to go
          </Caption>
        )}
      </div>
      {queue === null && (
        <BodyText role="status" tone="muted" className={clsx("mt-6")}>
          Loading cards…
        </BodyText>
      )}
      {queue !== null && !card && (
        <div className={clsx("mt-6 border-t border-ink/10 py-16 text-center sm:py-24")}>
          <SectionTitle>
            {reviewedCount === 0 ? "Nothing due right now" : "All done for now"}
          </SectionTitle>
          <BodyText tone="muted" className={clsx("mx-auto mt-2 max-w-sm")}>
            {reviewedCount === 0
              ? `Cards come back here when they’re due. ${deckCounts(cards).total} in this deck.`
              : `${tally.right} right, ${tally.wrong} wrong. Each card comes back when it’s due.`}
          </BodyText>
          <Link
            to={deck}
            className={clsx(
              "mt-6 inline-block rounded-md border border-ink/15 px-4 py-2 text-sm font-medium",
              "hover:bg-ink/5"
            )}
          >
            Back to flashcards
          </Link>
        </div>
      )}
      {card && (
        <section aria-label="Flashcard" className={clsx("mt-6 border-t border-ink/10 pt-8")}>
          <div className={clsx("mx-auto max-w-2xl")}>
            <Caption tone="muted">Front</Caption>
            <p className={clsx("mt-2 text-xl leading-8 font-semibold wrap-anywhere")}>
              {card.front}
            </p>
            {answerShown ? (
              <div className={clsx("mt-8 border-t border-ink/10 pt-6")}>
                <Caption tone="muted">Back</Caption>
                <p className={clsx("mt-2 text-base leading-7 whitespace-pre-wrap wrap-anywhere")}>
                  {card.back}
                </p>
                {card.page_title && (
                  <Caption tone="muted" className={clsx("mt-4 truncate")}>
                    From {card.page_title}
                  </Caption>
                )}
                <div className={clsx("mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4")}>
                  {grades.map((option, index) => (
                    <button
                      key={option}
                      type="button"
                      disabled={busy}
                      onClick={() => void grade(option)}
                      className={clsx(
                        "rounded-md border px-3 py-2 text-left text-sm",
                        option === Grade.Good
                          ? "border-action bg-action text-on-action hover:bg-action/85"
                          : "border-ink/15 hover:bg-ink/5"
                      )}
                    >
                      <span className={clsx("block font-medium")}>{gradeLabels[option]}</span>
                      <span className={clsx("block text-xs opacity-75")}>
                        {describeInterval(nextSchedule(card, option).interval_days)} · {index + 1}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <button
                type="button"
                autoFocus
                onClick={() => setAnswerShown(true)}
                className={clsx(
                  "mt-8 w-full rounded-md bg-action px-4 py-2.5 text-sm font-medium text-on-action sm:w-auto",
                  "hover:bg-action/85"
                )}
              >
                Show answer
                <span className={clsx("ml-2 text-xs opacity-75")}>Space</span>
              </button>
            )}
            {error && (
              <BodyText role="alert" tone="error" className={clsx("mt-4")}>
                {error}
              </BodyText>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
