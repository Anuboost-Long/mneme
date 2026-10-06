import type { Module } from "@/features/courses/lib/module/types";
import type { Page } from "@/features/courses/lib/page/types";
import { getDeckCards } from "@/features/flashcards/lib/card/actions";
import { getModulePrep } from "@/features/prepare/lib/prep/actions";
import { startJob } from "@/shared/lib/backgroundJobs";
import { errorMessage } from "@/shared/lib/errorMessage";

import { SESSION_QUESTIONS, writeSession } from "./generate";
import { createSession } from "./session/actions";

export const studyJobScope = (moduleId: number) => `study:${moduleId}`;

export function startStudySession(
  courseId: number,
  module: Pick<Module, "id" | "name">,
  pages: Page[]
) {
  const job = startJob(
    studyJobScope(module.id),
    "Preparing a study session",
    `${module.name} · starting the agent`
  );
  void (async () => {
    try {
      const [deck, prep] = await Promise.all([getDeckCards(module.id), getModulePrep(module.id)]);
      const draft = await writeSession(
        pages,
        deck.length === 0,
        courseId,
        (written) => {
          if (written > 0)
            job.update(
              `${module.name} · ${written} of ${SESSION_QUESTIONS} questions`,
              written / (SESSION_QUESTIONS + 1)
            );
        },
        prep?.topics
      );
      job.update(`${module.name} · saving`, SESSION_QUESTIONS / (SESSION_QUESTIONS + 1));
      const sessionId = await createSession(
        module,
        draft.overview,
        draft.topics,
        draft.questions,
        draft.cards
      );
      job.finish(
        "Your study session is ready",
        `${module.name} · ${draft.topics.length} topics, ${draft.questions.length} questions`,
        {
          label: "Start session",
          path: `/courses/${courseId}/modules/${module.id}/study/${sessionId}`
        }
      );
    } catch (error) {
      job.fail(
        "Couldn’t prepare the study session",
        errorMessage(error, "Try again from Study → New study session.")
      );
    }
  })();
}
