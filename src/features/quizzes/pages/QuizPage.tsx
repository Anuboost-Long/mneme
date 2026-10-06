import ModuleSubpageHeader from "@/features/courses/components/ModuleSubpageHeader";
import type { Course } from "@/features/courses/lib/course/types";
import type { Module } from "@/features/courses/lib/module/types";
import { errorMessage } from "@/shared/lib/errorMessage";
import { BodyText, Caption, PageTitle } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useState } from "react";
import { Link } from "react-router-dom";

import QuizRunner, { primaryButton, secondaryButton } from "../components/QuizRunner";
import { recordAttempt } from "../lib/quiz/actions";
import { rightAnswer, type AttemptAnswer, type Question, type Quiz } from "../lib/quiz/types";

export default function QuizPage({
  course,
  module,
  quiz,
  questions,
  ready
}: Readonly<{
  course: Course | undefined;
  module: Module | undefined;
  quiz: Quiz | null;
  questions: Question[];
  ready: boolean;
}>) {
  const [answers, setAnswers] = useState<AttemptAnswer[] | null>(null);
  const [run, setRun] = useState(0);
  const [saveError, setSaveError] = useState("");

  if (!ready)
    return (
      <BodyText role="status" tone="muted" className={clsx("p-8")}>
        Opening this quiz…
      </BodyText>
    );
  if (!course || !module || !quiz || !questions.length)
    return (
      <section className={clsx("p-8 sm:p-14")}>
        <PageTitle>Quiz not found</PageTitle>
        <BodyText tone="muted" className={clsx("mt-3")}>
          It may have been deleted, or its module moved to Recently deleted.
        </BodyText>
        {course && module && (
          <Link
            to={`/courses/${course.id}/modules/${module.id}/quizzes`}
            className={clsx("mt-6 inline-block text-sm underline underline-offset-4")}
          >
            Back to quizzes
          </Link>
        )}
      </section>
    );

  const quizzesPath = `/courses/${course.id}/modules/${module.id}/quizzes`;
  const pagePath = (pageId: number | null) =>
    pageId ? `/courses/${course.id}/modules/${module.id}/pages/${pageId}` : null;

  function finish(finished: AttemptAnswer[]) {
    if (!quiz) return;
    setSaveError("");
    setAnswers(finished);
    recordAttempt(quiz.id, finished).catch((error) =>
      setSaveError(errorMessage(error, "Couldn’t save this score."))
    );
  }

  function restart() {
    setAnswers(null);
    setRun(run + 1);
    setSaveError("");
  }

  const header = (
    <ModuleSubpageHeader
      course={course}
      module={module}
      trail={[{ label: "Quizzes", to: quizzesPath }, { label: quiz.title }]}
    />
  );

  if (answers) {
    const score = answers.filter((answer) => answer.correct).length;
    return (
      <div className={clsx("mx-auto w-full max-w-2xl px-4 py-5 sm:px-6")}>
        {header}
        <PageTitle className={clsx("mt-6 wrap-anywhere")}>
          You got {score} of {questions.length}
        </PageTitle>
        {saveError && (
          <BodyText role="alert" tone="error" className={clsx("mt-2")}>
            {saveError}
          </BodyText>
        )}
        <ol className={clsx("mt-6 divide-y divide-ink/10 border-t border-ink/10")}>
          {questions.map((item, itemIndex) => {
            const correct = answers[itemIndex]?.correct ?? false;
            return (
              <li key={item.id} className={clsx("flex gap-3 py-3")}>
                <span
                  className={clsx(
                    "w-14 shrink-0 text-xs font-medium",
                    correct ? "text-success" : "text-danger"
                  )}
                >
                  {correct ? "Right" : "Missed"}
                </span>
                <div className={clsx("min-w-0")}>
                  <p className={clsx("text-sm wrap-anywhere")}>{item.prompt}</p>
                  {!correct && (
                    <Caption tone="muted" className={clsx("mt-1 block wrap-anywhere")}>
                      Answer: {rightAnswer(item)}
                    </Caption>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <div className={clsx("mt-6 flex flex-wrap gap-2")}>
          <button type="button" onClick={restart} className={primaryButton}>
            Try again
          </button>
          <Link to={quizzesPath} className={secondaryButton}>
            Back to quizzes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("mx-auto w-full max-w-2xl px-4 py-5 sm:px-6")}>
      {header}
      <QuizRunner
        key={run}
        questions={questions}
        pagePath={pagePath}
        finishLabel="See your score"
        onFinish={finish}
      />
    </div>
  );
}
