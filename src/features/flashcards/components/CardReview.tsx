import { reviewCard } from "@/features/flashcards/lib/card/actions";
import type { Flashcard } from "@/features/flashcards/lib/card/types";
import {
  describeInterval,
  Grade,
  gradeLabels,
  grades,
  nextSchedule
} from "@/features/flashcards/lib/schedule";
import { errorMessage } from "@/shared/lib/errorMessage";
import { BodyText, Caption } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

const gradeKeys: Record<string, Grade> = {
  "1": Grade.Again,
  "2": Grade.Hard,
  "3": Grade.Good,
  "4": Grade.Easy
};

export type Tally = { right: number; wrong: number };

export default function CardReview({
  cards,
  onGrade,
  onDone
}: Readonly<{
  cards: Flashcard[];
  onGrade?: (card: Flashcard, right: boolean) => void;
  onDone: (tally: Tally) => void;
}>) {
  const [queue, setQueue] = useState(cards);
  const [answerShown, setAnswerShown] = useState(false);
  const [tally, setTally] = useState<Tally>({ right: 0, wrong: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const card = queue[0] as Flashcard | undefined;
  const showAnswerButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!card) onDone(tally);
    else if (!answerShown) showAnswerButton.current?.focus();
  }, [card, answerShown]);

  async function grade(chosen: Grade) {
    if (!card || busy) return;
    setBusy(true);
    setError("");
    try {
      const schedule = await reviewCard(card, chosen);
      const reviewed = { ...card, ...schedule, last_reviewed_at: "now" };
      const right = chosen !== Grade.Again;
      onGrade?.(card, right);
      setTally((current) =>
        right ? { ...current, right: current.right + 1 } : { ...current, wrong: current.wrong + 1 }
      );
      setQueue((current) => {
        const rest = current.slice(1);
        return right ? rest : [...rest, reviewed];
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

  if (!card) return null;

  return (
    <section aria-label="Flashcard" className={clsx("mt-6 border-t border-ink/10 pt-8")}>
      <div className={clsx("mx-auto max-w-2xl")}>
        <div className={clsx("flex items-baseline justify-between gap-4")}>
          <Caption tone="muted">Front</Caption>
          <Caption role="status" tone="muted">
            {queue.length} to go
          </Caption>
        </div>
        <p className={clsx("mt-2 text-xl leading-8 font-semibold wrap-anywhere")}>{card.front}</p>
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
            ref={showAnswerButton}
            type="button"
            onClick={() => setAnswerShown(true)}
            className={clsx(
              "mt-8 w-full rounded-md bg-action px-4 py-2.5 text-sm font-medium text-on-action sm:w-auto",
              "hover:bg-action/85"
            )}
          >
            {"Show answer"}
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
  );
}
