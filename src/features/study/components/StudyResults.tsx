import type { Page } from "@/features/courses/lib/page/types";
import { primaryButton, secondaryButton } from "@/features/quizzes/components/QuizRunner";
import { BodyText, Caption } from "@/shared/ui/Typography";
import clsx from "clsx";
import { Link } from "react-router-dom";

import {
  weakTopics,
  type SessionResults,
  type StudySession,
  type Topic
} from "../lib/session/types";
import PageLinks from "./PageLinks";

function quizLine(results: SessionResults | null) {
  return results?.quizTotal ? `${results.quizRight} of ${results.quizTotal} right` : "Not taken";
}

function cardsLine(results: SessionResults | null) {
  if (!results || results.cardsRight + results.cardsWrong === 0) return "None reviewed";
  return `${results.cardsRight} right, ${results.cardsWrong} wrong`;
}

export default function StudyResults({
  session,
  results,
  saveError,
  topicPages,
  pagePath,
  studyPath,
  onStudyAgain
}: Readonly<{
  session: StudySession;
  results: SessionResults | null;
  saveError: string;
  topicPages: (topic: Topic) => Page[];
  pagePath: (pageId: number) => string;
  studyPath: string;
  onStudyAgain: () => void;
}>) {
  const scored = results?.topics ?? [];
  const weak = weakTopics(scored);
  const topicByName = new Map(session.topics.map((topic) => [topic.name, topic]));
  const review = weak.flatMap((result) => topicByName.get(result.topic) ?? []);

  return (
    <>
      {saveError && (
        <BodyText role="alert" tone="error" className={clsx("mt-2")}>
          {saveError}
        </BodyText>
      )}
      <dl className={clsx("mt-3 grid gap-x-8 gap-y-3 sm:grid-cols-2")}>
        <div>
          <dt className={clsx("text-xs text-muted")}>Quiz</dt>
          <dd className={clsx("text-sm font-medium tabular-nums")}>{quizLine(results)}</dd>
        </div>
        <div>
          <dt className={clsx("text-xs text-muted")}>Flashcards</dt>
          <dd className={clsx("text-sm font-medium tabular-nums")}>{cardsLine(results)}</dd>
        </div>
      </dl>
      <h3 className={clsx("mt-8 text-sm font-semibold")}>Weak areas</h3>
      <ul className={clsx("mt-2 divide-y divide-ink/10 border-t border-ink/10")}>
        {scored.map((result) => {
          const isWeak = weak.includes(result);
          return (
            <li
              key={result.topic}
              className={clsx("flex items-baseline justify-between gap-3 py-2.5")}
            >
              <span className={clsx("min-w-0 text-sm wrap-anywhere", isWeak && "font-medium")}>
                {result.topic}
              </span>
              <span
                className={clsx(
                  "shrink-0 text-xs tabular-nums",
                  isWeak ? "text-danger" : "text-muted"
                )}
              >
                {result.total ? `${result.right} of ${result.total} right` : "Not tested"}
              </span>
            </li>
          );
        })}
      </ul>
      <h3 className={clsx("mt-8 text-sm font-semibold")}>Recommended review</h3>
      {review.length === 0 ? (
        <BodyText tone="muted" className={clsx("mt-2")}>
          No weak topics: every topic you were tested on was at least 70% right.
        </BodyText>
      ) : (
        <ol className={clsx("mt-2 divide-y divide-ink/10 border-t border-ink/10")}>
          {review.map((topic) => (
            <li key={topic.name} className={clsx("py-3")}>
              <p className={clsx("text-sm font-medium wrap-anywhere")}>{topic.name}</p>
              <BodyText tone="muted" className={clsx("mt-1")}>
                {topic.summary}
              </BodyText>
              {topicPages(topic).length > 0 && (
                <Caption tone="muted" className={clsx("mt-1 block wrap-anywhere")}>
                  Re-read <PageLinks pages={topicPages(topic)} pagePath={pagePath} />
                </Caption>
              )}
            </li>
          ))}
        </ol>
      )}
      <div className={clsx("mt-8 flex flex-wrap gap-2 border-t border-ink/10 pt-5")}>
        <button type="button" onClick={onStudyAgain} className={primaryButton}>
          Study again
        </button>
        <Link to={studyPath} className={secondaryButton}>
          Back to study sessions
        </Link>
      </div>
    </>
  );
}
