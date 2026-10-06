import clsx from "clsx";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import ModuleSubpageHeader from "@/features/courses/components/ModuleSubpageHeader";
import type { Course } from "@/features/courses/lib/course/types";
import type { Module } from "@/features/courses/lib/module/types";
import type { Page } from "@/features/courses/lib/page/types";
import ConfirmDeleteDialog from "@/shared/ui/ConfirmDeleteDialog";
import { rowAction } from "@/shared/ui/rowAction";
import { BodyText, Caption, PageTitle, SectionTitle } from "@/shared/ui/Typography";

import NewQuizDialog from "../components/NewQuizDialog";
import { deleteQuiz } from "../lib/quiz/actions";
import type { Quiz } from "../lib/quiz/types";

function scoreLine(quiz: Quiz) {
  const questions = `${quiz.question_count} ${quiz.question_count === 1 ? "question" : "questions"}`;
  if (!quiz.attempt_count) return `${questions} · Not taken yet`;
  const attempts = `${quiz.attempt_count} ${quiz.attempt_count === 1 ? "attempt" : "attempts"}`;
  return `${questions} · Last ${quiz.last_score}/${quiz.question_count} · Best ${quiz.best_score}/${quiz.question_count} · ${attempts}`;
}

export default function QuizzesPage({
  course,
  module,
  pages,
  quizzes,
  ready,
  reload
}: Readonly<{
  course: Course | undefined;
  module: Module | undefined;
  pages: Page[];
  quizzes: Quiz[];
  ready: boolean;
  reload: () => Promise<void>;
}>) {
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Quiz | null>(null);

  if (!ready)
    return (
      <BodyText role="status" tone="muted" className={clsx("p-8")}>
        Opening quizzes…
      </BodyText>
    );
  if (!course || !module)
    return (
      <section className={clsx("p-8 sm:p-14")}>
        <PageTitle>Module not found</PageTitle>
        <BodyText tone="muted" className={clsx("mt-3")}>
          This module may have been deleted. Choose another course from the sidebar.
        </BodyText>
      </section>
    );

  const quizPath = (quiz: Quiz) => `/courses/${course.id}/modules/${module.id}/quizzes/${quiz.id}`;

  return (
    <div className={clsx("px-4 py-5 sm:px-6")}>
      <ModuleSubpageHeader course={course} module={module} trail={[{ label: "Quizzes" }]} />
      <div className={clsx("mt-6 flex flex-wrap items-end justify-between gap-4")}>
        <div className={clsx("min-w-0")}>
          <PageTitle className={clsx("wrap-anywhere")}>{module.name} quizzes</PageTitle>
          <BodyText tone="muted" className={clsx("mt-2")}>
            Test yourself on this module, or on one page of it, with questions written from your own material.
          </BodyText>
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className={clsx("rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action", "hover:bg-action/85")}
        >
          New quiz
        </button>
      </div>
      {quizzes.length === 0 ? (
        <div className={clsx("mt-6 border-t border-ink/10 py-16 text-center sm:py-24")}>
          <SectionTitle>No quizzes yet</SectionTitle>
          <BodyText tone="muted" className={clsx("mx-auto mt-2 max-w-sm")}>
            New quiz writes multiple-choice, true-or-false and short-answer questions from this module’s pages.
          </BodyText>
        </div>
      ) : (
        <ul className={clsx("mt-6 divide-y divide-ink/10 border-t border-ink/10")}>
          {quizzes.map((quiz) => (
            <li key={quiz.id} className={clsx("flex flex-wrap items-center gap-3 py-3")}>
              <div className={clsx("min-w-0 flex-1")}>
                <Link to={quizPath(quiz)} className={clsx("text-sm font-medium wrap-anywhere hover:underline underline-offset-4")}>
                  {quiz.title}
                </Link>
                <Caption tone="muted" className={clsx("mt-1 block")}>
                  {scoreLine(quiz)}
                </Caption>
              </div>
              <div className={clsx("flex shrink-0 gap-1")}>
                <Link to={quizPath(quiz)} className={rowAction()}>
                  {quiz.attempt_count ? "Try again" : "Start"}
                </Link>
                <button type="button" onClick={() => setDeleting(quiz)} className={rowAction("danger")}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <NewQuizDialog
        open={creating}
        courseId={course.id}
        module={module}
        pages={pages}
        onCreated={(quizId) => navigate(`/courses/${course.id}/modules/${module.id}/quizzes/${quizId}`)}
        onClose={() => setCreating(false)}
      />
      <ConfirmDeleteDialog
        open={deleting !== null}
        title="Delete this quiz?"
        message={deleting ? `“${deleting.title}” and its scores are deleted for good.` : ""}
        confirmLabel="Delete quiz"
        failure="Couldn’t delete this quiz. Try again."
        onConfirm={() => (deleting ? deleteQuiz(deleting.id) : Promise.resolve())}
        onClose={() => setDeleting(null)}
        onDeleted={() => {
          setDeleting(null);
          void reload();
        }}
      />
    </div>
  );
}
