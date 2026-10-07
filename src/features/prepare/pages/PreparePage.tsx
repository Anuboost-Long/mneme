import ModuleSubpageHeader from "@/features/courses/components/ModuleSubpageHeader";
import type { Course } from "@/features/courses/lib/course/types";
import type { Module } from "@/features/courses/lib/module/types";
import type { Page } from "@/features/courses/lib/page/types";
import type { Flashcard } from "@/features/flashcards/lib/card/types";
import type { Quiz } from "@/features/quizzes/lib/quiz/types";
import FindTasksDialog from "@/features/tasks/components/FindTasksDialog";
import { useJobs } from "@/shared/lib/backgroundJobs";
import { BodyText, PageTitle } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect, useState } from "react";

import PreparedModule from "../components/PreparedModule";
import PrepChoices from "../components/PrepChoices";
import type { ModulePrep } from "../lib/prep/types";
import { pagesNeedingCards, prepJobScope, startPrepare } from "../lib/prepareJob";

export default function PreparePage({
  courses,
  course,
  module,
  pages,
  prep,
  cards,
  quiz,
  newTasks,
  condensed,
  ready,
  reload
}: Readonly<{
  courses: Course[];
  course: Course | undefined;
  module: Module | undefined;
  pages: Page[];
  prep: ModulePrep | null;
  cards: Flashcard[];
  quiz: Quiz | null;
  newTasks: number;
  condensed: Set<number>;
  ready: boolean;
  reload: () => Promise<void>;
}>) {
  const [reviewingTasks, setReviewingTasks] = useState(false);
  const jobs = useJobs().filter((job) => module && job.scope === prepJobScope(module.id));
  const running = jobs.find((job) => job.status === "running");
  const finished = jobs.length - (running ? 1 : 0);

  useEffect(() => {
    if (finished) void reload();
  }, [finished, reload]);

  if (!ready)
    return (
      <BodyText role="status" tone="muted" className={clsx("p-8")}>
        Opening Prepare module…
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

  const generated = new Set([prep?.summary_page_id, prep?.notes_page_id]);
  const material = pages.filter((page) => !generated.has(page.id));
  const cardPages = pagesNeedingCards(material, new Set(cards.map((card) => card.page_id))).length;

  return (
    <div className={clsx("mx-auto w-full max-w-3xl px-4 py-5 sm:px-6")}>
      <ModuleSubpageHeader course={course} module={module} trail={[{ label: "Prepare" }]} />
      <PageTitle className={clsx("mt-6 wrap-anywhere")}>Prepare {module.name}</PageTitle>
      <BodyText tone="muted" className={clsx("mt-2")}>
        mneme reads the whole module once, including attached files, text in pictures and
        recordings, then makes what you choose.
      </BodyText>
      {running ? (
        <output className={clsx("mt-6 block border-t border-ink/10 pt-5")}>
          <p className={clsx("text-sm font-medium wrap-anywhere")}>{running.detail}</p>
          <progress
            aria-label={running.title}
            max={1}
            value={running.progress ?? undefined}
            className={clsx("import-progress mt-2 block h-1.5 w-full")}
          />
          <BodyText tone="muted" className={clsx("mt-2")}>
            You can keep working; each part is saved as soon as it’s made.
          </BodyText>
        </output>
      ) : (
        <PrepChoices
          pages={material}
          prep={prep}
          hasQuiz={!!quiz}
          cardPages={cardPages}
          condensed={condensed}
          onPrepare={(outputs, connectionId) => startPrepare(course.id, module, outputs, connectionId)}
        />
      )}
      {prep?.prepared_at && (
        <PreparedModule
          base={`/courses/${course.id}/modules/${module.id}`}
          prep={prep}
          pages={pages}
          cards={cards}
          quiz={quiz}
          newTasks={newTasks}
          onReviewTasks={() => setReviewingTasks(true)}
        />
      )}
      <FindTasksDialog
        open={reviewingTasks}
        courses={courses}
        courseId={course.id}
        moduleId={module.id}
        onAdded={() => void reload()}
        onClose={() => setReviewingTasks(false)}
      />
    </div>
  );
}
