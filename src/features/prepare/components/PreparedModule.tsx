import { pageTypeLabels, PageType, type Page } from "@/features/courses/lib/page/types";
import { deckCounts } from "@/features/flashcards/lib/card/actions";
import type { Flashcard } from "@/features/flashcards/lib/card/types";
import type { Quiz } from "@/features/quizzes/lib/quiz/types";
import PageLinks from "@/features/study/components/PageLinks";
import { timeAgo } from "@/shared/lib/date";
import { Caption, SectionTitle } from "@/shared/ui/Typography";
import clsx from "clsx";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import type { ModulePrep } from "../lib/prep/types";

const link = clsx("underline underline-offset-4 hover:text-ink");

function Row({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div className={clsx("grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4")}>
      <dt className={clsx("text-sm font-medium")}>{label}</dt>
      <dd className={clsx("min-w-0 text-sm text-muted wrap-anywhere")}>{children}</dd>
    </div>
  );
}

function typeBreakdown(pages: Page[]) {
  const counts = new Map<PageType, number>();
  for (const page of pages) counts.set(page.type, (counts.get(page.type) ?? 0) + 1);
  return [...counts]
    .map(([type, count]) => {
      const label = pageTypeLabels[type].toLowerCase();
      return `${count} ${count === 1 || label.endsWith("s") ? label : label + "s"}`;
    })
    .join(", ");
}

function quizLine(quiz: Quiz) {
  if (!quiz.attempt_count) return `${quiz.question_count} questions · Not taken yet`;
  return `${quiz.question_count} questions · Best ${quiz.best_score}/${quiz.question_count}`;
}

export default function PreparedModule({
  base,
  prep,
  pages,
  cards,
  quiz,
  newTasks,
  onReviewTasks
}: Readonly<{
  base: string;
  prep: ModulePrep;
  pages: Page[];
  cards: Flashcard[];
  quiz: Quiz | null;
  newTasks: number;
  onReviewTasks: () => void;
}>) {
  const pagePath = (id: number) => `${base}/pages/${id}`;
  const generated = new Set([prep.summary_page_id, prep.notes_page_id]);
  const material = pages.filter((page) => !generated.has(page.id));
  const exercises = material.filter(
    (page) => page.type === PageType.Exercise || page.type === PageType.Assignment
  );
  const discussions = material.filter((page) => page.type === PageType.Discussion);
  const summary = pages.find((page) => page.id === prep.summary_page_id);
  const notes = pages.find((page) => page.id === prep.notes_page_id);
  const counts = deckCounts(cards);

  return (
    <section aria-labelledby="prepared-title" className={clsx("mt-10")}>
      <div className={clsx("flex flex-wrap items-baseline justify-between gap-2")}>
        <SectionTitle id="prepared-title">Prepared module</SectionTitle>
        {prep.prepared_at && (
          <Caption tone="muted">Prepared {timeAgo(prep.prepared_at).toLowerCase()}</Caption>
        )}
      </div>
      <dl className={clsx("mt-3 divide-y divide-ink/10 border-t border-ink/10")}>
        <Row label="Original material">
          {material.length} {material.length === 1 ? "page" : "pages"}
          {material.length > 0 && `: ${typeBreakdown(material)}`}
        </Row>
        <Row label="Exercises">
          {exercises.length ? (
            <PageLinks pages={exercises} pagePath={pagePath} />
          ) : (
            "None in this module"
          )}
        </Row>
        <Row label="Discussions">
          {discussions.length ? (
            <PageLinks pages={discussions} pagePath={pagePath} />
          ) : (
            "None in this module"
          )}
        </Row>
        <Row label="Summary">
          {summary ? (
            <Link to={pagePath(summary.id)} className={link}>
              {summary.title}
            </Link>
          ) : (
            "Not made"
          )}
        </Row>
        <Row label="Revision notes">
          {notes ? (
            <Link to={pagePath(notes.id)} className={link}>
              {notes.title}
            </Link>
          ) : (
            "Not made"
          )}
        </Row>
        <Row label="Flashcards">
          {counts.total} {counts.total === 1 ? "card" : "cards"}, {counts.due} due ·{" "}
          <Link to={`${base}/flashcards${counts.due ? "/review" : ""}`} className={link}>
            {counts.due ? "Study" : "Open deck"}
          </Link>
        </Row>
        <Row label="Practice quiz">
          {quiz ? (
            <>
              <Link to={`${base}/quizzes/${quiz.id}`} className={link}>
                {quiz.title}
              </Link>
              {` · ${quizLine(quiz)}`}
            </>
          ) : (
            "Not made"
          )}
        </Row>
        <Row label="Tasks">
          {newTasks ? (
            <>
              {newTasks === 1 ? "1 task isn’t" : `${newTasks} tasks aren’t`} in Tasks yet ·{" "}
              <button type="button" onClick={onReviewTasks} className={link}>
                Review and add
              </button>
            </>
          ) : (
            "Every task found is already in Tasks"
          )}
        </Row>
        {prep.unread.length > 0 && (
          <Row label="Couldn’t read">
            <ul className={clsx("space-y-1")}>
              {prep.unread.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Row>
        )}
      </dl>
    </section>
  );
}
