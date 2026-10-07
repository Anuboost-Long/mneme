import ModuleSubpageHeader from "@/features/courses/components/ModuleSubpageHeader";
import type { Course } from "@/features/courses/lib/course/types";
import type { Module } from "@/features/courses/lib/module/types";
import type { Page } from "@/features/courses/lib/page/types";
import CardReview, { type Tally } from "@/features/flashcards/components/CardReview";
import type { Flashcard } from "@/features/flashcards/lib/card/types";
import QuizRunner, {
  primaryButton,
  secondaryButton
} from "@/features/quizzes/components/QuizRunner";
import { recordAttempt } from "@/features/quizzes/lib/quiz/actions";
import type { AttemptAnswer, Question } from "@/features/quizzes/lib/quiz/types";
import { errorMessage } from "@/shared/lib/errorMessage";
import { BodyText, Caption, PageTitle, SectionTitle } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import PageLinks from "../components/PageLinks";
import StudyResults from "../components/StudyResults";
import { saveResults } from "../lib/session/actions";
import {
  sessionResults,
  type CardResult,
  type SessionResults,
  type StudySession,
  type Topic
} from "../lib/session/types";

type Step = "summary" | "flashcards" | "quiz" | "results";

const steps: { id: Step; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "flashcards", label: "Flashcards" },
  { id: "quiz", label: "Quiz" },
  { id: "results", label: "Results" }
];

function savedResults(session: StudySession): SessionResults | null {
  if (!session.results) return null;
  return {
    topics: session.results,
    quizRight: session.quiz_right,
    quizTotal: session.quiz_total,
    cardsRight: session.cards_right,
    cardsWrong: session.cards_wrong
  };
}

export default function StudySessionPage({
  course,
  module,
  pages,
  session,
  questions,
  dueCards,
  ready,
  reload
}: Readonly<{
  course: Course | undefined;
  module: Module | undefined;
  pages: Page[];
  session: StudySession | null;
  questions: Question[];
  dueCards: Flashcard[];
  ready: boolean;
  reload: () => Promise<void>;
}>) {
  const [step, setStep] = useState<Step | null>(null);
  const [cardResults, setCardResults] = useState<CardResult[]>([]);
  const [cardTally, setCardTally] = useState<Tally | null>(null);
  const [results, setResults] = useState<SessionResults | null>(null);
  const [saveError, setSaveError] = useState("");
  const stepStart = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session || step) return;
    const saved = savedResults(session);
    setResults(saved);
    setStep(saved ? "results" : "summary");
  }, [session, step]);

  useEffect(() => {
    stepStart.current?.focus();
  }, [step]);

  if (!ready || (session && !step))
    return (
      <BodyText role="status" tone="muted" className={clsx("p-8")}>
        Opening this study session…
      </BodyText>
    );
  if (!course || !module || !session || !step)
    return (
      <section className={clsx("p-8 sm:p-14")}>
        <PageTitle>Study session not found</PageTitle>
        <BodyText tone="muted" className={clsx("mt-3")}>
          It may have been deleted, or its module moved to Recently deleted.
        </BodyText>
        {course && module && (
          <Link
            to={`/courses/${course.id}/modules/${module.id}/study`}
            className={clsx("mt-6 inline-block text-sm underline underline-offset-4")}
          >
            Back to study sessions
          </Link>
        )}
      </section>
    );

  const studyPath = `/courses/${course.id}/modules/${module.id}/study`;
  const pagePath = (pageId: number) => `/courses/${course.id}/modules/${module.id}/pages/${pageId}`;
  const topicPages = (topic: Topic) => pages.filter((page) => topic.pageIds.includes(page.id));
  const stepIndex = steps.findIndex((item) => item.id === step);

  function finish(answers: AttemptAnswer[] | null) {
    if (!session) return;
    const finished = sessionResults(session.topics, questions, answers, cardResults);
    setResults(finished);
    setStep("results");
    setSaveError("");
    Promise.all([
      answers && session.quiz_id ? recordAttempt(session.quiz_id, answers) : undefined,
      saveResults(session.id, finished)
    ]).catch((error) => setSaveError(errorMessage(error, "Couldn’t save these results.")));
  }

  async function studyAgain() {
    await reload();
    setCardResults([]);
    setCardTally(null);
    setStep("summary");
  }

  const heading = (text: string) => <SectionTitle className={clsx("mt-8")}>{text}</SectionTitle>;

  const next = (label: string, to: Step) => (
    <div className={clsx("mt-8 flex justify-end border-t border-ink/10 pt-5")}>
      <button type="button" onClick={() => setStep(to)} className={primaryButton}>
        {label}
      </button>
    </div>
  );

  let content;
  switch (step) {
    case "summary":
      content = (
        <>
          {heading("Summary")}
          <div className={clsx("mt-3 space-y-3")}>
            {session.overview.split(/\n\s*\n/).map((paragraph) => (
              <BodyText key={paragraph} className={clsx("whitespace-pre-wrap")}>
                {paragraph}
              </BodyText>
            ))}
          </div>
          <h3 className={clsx("mt-8 text-sm font-semibold")}>Key topics</h3>
          <ul className={clsx("mt-2 divide-y divide-ink/10 border-t border-ink/10")}>
            {session.topics.map((topic) => (
              <li key={topic.name} className={clsx("py-3")}>
                <p className={clsx("text-sm font-medium wrap-anywhere")}>{topic.name}</p>
                <BodyText tone="muted" className={clsx("mt-1")}>
                  {topic.summary}
                </BodyText>
                {topicPages(topic).length > 0 && (
                  <Caption tone="muted" className={clsx("mt-1 block wrap-anywhere")}>
                    From <PageLinks pages={topicPages(topic)} pagePath={pagePath} />
                  </Caption>
                )}
              </li>
            ))}
          </ul>
          {next("Next: flashcards", "flashcards")}
        </>
      );
      break;
    case "flashcards":
      content = (
        <>
          {heading("Flashcards")}
          {dueCards.length > 0 && !cardTally ? (
            <>
              <CardReview
                cards={dueCards}
                onGrade={(card, right) =>
                  setCardResults((current) => [
                    ...current,
                    { cardId: card.id, pageId: card.page_id, right }
                  ])
                }
                onDone={setCardTally}
              />
              <div className={clsx("mt-8 flex justify-end")}>
                <button type="button" onClick={() => setStep("quiz")} className={secondaryButton}>
                  Skip to the quiz
                </button>
              </div>
            </>
          ) : (
            <>
              <BodyText tone="muted" className={clsx("mt-2")}>
                {cardTally
                  ? `${cardTally.right} right, ${cardTally.wrong} wrong. Each card comes back when it’s due.`
                  : "No flashcards are due in this module right now."}
              </BodyText>
              {next("Next: quiz", "quiz")}
            </>
          )}
        </>
      );
      break;
    case "quiz":
      content = (
        <>
          {heading("Quiz")}
          {questions.length > 0 ? (
            <QuizRunner
              questions={questions}
              pagePath={(pageId) => (pageId ? pagePath(pageId) : null)}
              finishLabel="See results"
              onFinish={finish}
            />
          ) : (
            <>
              <BodyText tone="muted" className={clsx("mt-2")}>
                This session’s quiz was deleted, so your results come from your flashcards only.
              </BodyText>
              <div className={clsx("mt-8 flex justify-end border-t border-ink/10 pt-5")}>
                <button type="button" onClick={() => finish(null)} className={primaryButton}>
                  See results
                </button>
              </div>
            </>
          )}
        </>
      );
      break;
    case "results":
      content = (
        <>
          {heading("Results")}
          <StudyResults
            session={session}
            results={results}
            saveError={saveError}
            topicPages={topicPages}
            pagePath={pagePath}
            studyPath={studyPath}
            onStudyAgain={() => void studyAgain()}
          />
        </>
      );
      break;
  }

  return (
    <div className={clsx("mx-auto w-full max-w-2xl px-4 py-5 sm:px-6")}>
      <ModuleSubpageHeader
        course={course}
        module={module}
        trail={[{ label: "Study", to: studyPath }, { label: "Session" }]}
      />
      <PageTitle className={clsx("mt-6 wrap-anywhere")}>Study {module.name}</PageTitle>
      <ol aria-label="Steps" className={clsx("mt-4 flex gap-1")}>
        {steps.map((item, index) => (
          <li
            key={item.id}
            aria-current={item.id === step ? "step" : undefined}
            className={clsx(
              "flex-1 border-t-2 pt-1.5 text-xs",
              index <= stepIndex ? "border-action" : "border-ink/10",
              item.id === step ? "font-medium text-ink" : "text-muted"
            )}
          >
            {item.label}
          </li>
        ))}
      </ol>
      <div ref={stepStart} tabIndex={-1} className={clsx("focus:outline-none")}>
        {content}
      </div>
    </div>
  );
}
