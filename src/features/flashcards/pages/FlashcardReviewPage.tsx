import ModuleSubpageHeader from "@/features/courses/components/ModuleSubpageHeader";
import type { Course } from "@/features/courses/lib/course/types";
import type { Module } from "@/features/courses/lib/module/types";
import CardReview, { type Tally } from "@/features/flashcards/components/CardReview";
import DeckMissing from "@/features/flashcards/components/DeckMissing";
import { deckCounts } from "@/features/flashcards/lib/card/actions";
import type { Flashcard } from "@/features/flashcards/lib/card/types";
import { BodyText, PageTitle, SectionTitle } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

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
  const [tally, setTally] = useState<Tally | null>(null);

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

  if (!course || !module) return <DeckMissing ready={ready} />;

  const deck = `/courses/${course.id}/modules/${module.id}/flashcards`;
  const reviewedCount = tally ? tally.right + tally.wrong : 0;

  return (
    <div className={clsx("px-4 py-5 sm:px-6")}>
      <ModuleSubpageHeader
        course={course}
        module={module}
        trail={[
          { label: "Flashcards", to: `/courses/${course.id}/modules/${module.id}/flashcards` },
          { label: "Study" }
        ]}
      />
      <PageTitle className={clsx("mt-6 wrap-anywhere")}>{module.name}</PageTitle>
      {queue === null && (
        <BodyText role="status" tone="muted" className={clsx("mt-6")}>
          Loading cards…
        </BodyText>
      )}
      {queue !== null && (queue.length === 0 || tally) && (
        <div className={clsx("mt-6 border-t border-ink/10 py-16 text-center sm:py-24")}>
          <SectionTitle>
            {reviewedCount === 0 ? "Nothing due right now" : "All done for now"}
          </SectionTitle>
          <BodyText tone="muted" className={clsx("mx-auto mt-2 max-w-sm")}>
            {reviewedCount === 0
              ? `Cards come back here when they’re due. ${deckCounts(cards).total} in this deck.`
              : `${tally?.right} right, ${tally?.wrong} wrong. Each card comes back when it’s due.`}
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
      {queue && queue.length > 0 && !tally && <CardReview cards={queue} onDone={setTally} />}
    </div>
  );
}
