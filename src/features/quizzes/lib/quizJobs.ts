import type { Module } from "@/features/courses/lib/module/types";
import type { Page } from "@/features/courses/lib/page/types";
import { startJob } from "@/shared/lib/backgroundJobs";
import { errorMessage } from "@/shared/lib/errorMessage";

import { writeQuiz } from "./generate";
import { createQuiz } from "./quiz/actions";
import type { QuestionKind } from "./quiz/types";

export const quizJobScope = (moduleId: number) => `quizzes:${moduleId}`;

// Writes the quiz in the background; the jobs tray shows its progress and
// offers Start quiz when it's ready.
export function startQuiz({
  courseId,
  module,
  page,
  pages,
  size,
  kinds,
  connectionId
}: {
  courseId: number;
  module: Pick<Module, "id" | "name">;
  page: Page | undefined;
  pages: Page[];
  size: number;
  kinds: QuestionKind[];
  connectionId: number | null;
}) {
  const title = `Quiz: ${page?.title ?? module.name}`;
  const job = startJob(quizJobScope(module.id), "Writing a quiz", `${title} · starting the agent`);
  void (async () => {
    try {
      const questions = await writeQuiz(page ? [page] : pages, size, kinds, courseId, connectionId, (written) => {
        if (written > 0) job.update(`${title} · ${written} of ${size} questions`, written / (size + 1));
      });
      job.update(`${title} · saving`, size / (size + 1));
      const quizId = await createQuiz(module.id, page?.id ?? null, title, questions);
      job.finish("Your quiz is ready", `${title} · ${questions.length} questions`, {
        label: "Start quiz",
        path: `/courses/${courseId}/modules/${module.id}/quizzes/${quizId}`
      });
    } catch (error) {
      job.fail("Couldn’t write the quiz", errorMessage(error, "Try again from Quizzes → New quiz."));
    }
  })();
}
