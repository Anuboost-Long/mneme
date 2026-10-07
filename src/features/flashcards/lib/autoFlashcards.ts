import type { Page } from "@/features/courses/lib/page/types";
import { startJob, type JobAction } from "@/shared/lib/backgroundJobs";
import { getSetting, putSetting } from "@/shared/lib/settings/actions";
import { useSyncExternalStore } from "react";

import { addCards } from "./card/actions";
import { suggestFlashcards } from "./generate";

export type Making = { done: number; total: number; error: string };

const AUTO_KEY = "flashcards.make-for-imports";

const making = new Map<number, Making>();
const listeners = new Set<() => void>();
let snapshot = new Map(making);

function notify() {
  snapshot = new Map(making);
  listeners.forEach((listener) => listener());
}

export async function makesCardsForImports() {
  return (await getSetting(AUTO_KEY)) !== "off";
}

export async function setMakesCardsForImports(on: boolean) {
  await putSetting(AUTO_KEY, on ? "on" : "off");
}

// `announce` puts the run in the jobs tray, with a pop-up when it ends;
// the quiet runs after an import leave it out.
export async function makeFlashcards(
  moduleId: number,
  pages: Pick<Page, "id" | "title" | "content">[],
  courseId?: number,
  announce?: { moduleName: string; deck: JobAction },
  connectionId?: number | null
) {
  const current = making.get(moduleId);
  if (current && current.done < current.total) return;
  const worthMaking = pages.filter(
    (page) => (page.content ?? "").replace(/<[^>]+>/g, "").trim().length > 80
  );
  if (worthMaking.length === 0) return;
  making.set(moduleId, { done: 0, total: worthMaking.length, error: "" });
  notify();
  const job =
    announce &&
    startJob(
      `flashcards:${moduleId}`,
      "Making flashcards",
      `${announce.moduleName} · page 1 of ${worthMaking.length}`
    );
  let added = 0;
  for (const [index, page] of worthMaking.entries()) {
    try {
      const cards = await suggestFlashcards([page], courseId, connectionId);
      await addCards(moduleId, cards);
      added += cards.length;
      making.set(moduleId, { ...(making.get(moduleId) as Making), done: index + 1 });
      if (job && index + 1 < worthMaking.length)
        job.update(
          `${announce.moduleName} · page ${index + 2} of ${worthMaking.length}`,
          (index + 1) / worthMaking.length
        );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Couldn’t make flashcards. Try again.";
      making.set(moduleId, { done: worthMaking.length, total: worthMaking.length, error: message });
      job?.fail("Couldn’t make flashcards", message);
      notify();
      return;
    }
    notify();
  }
  job?.finish(
    "Your flashcards are ready",
    `${added} new ${added === 1 ? "card" : "cards"} in ${announce?.moduleName}`,
    announce?.deck
  );
}

let importRuns = Promise.resolve();

export async function makeFlashcardsForImport(
  moduleId: number,
  page: Pick<Page, "id" | "title" | "content">,
  courseId?: number
) {
  if (!(await makesCardsForImports())) return;
  const run = importRuns.then(() => makeFlashcards(moduleId, [page], courseId));
  importRuns = run.catch(() => undefined);
  await run;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useMakingFlashcards(moduleId: number | undefined) {
  const all = useSyncExternalStore(subscribe, () => snapshot);
  return moduleId === undefined ? undefined : all.get(moduleId);
}
