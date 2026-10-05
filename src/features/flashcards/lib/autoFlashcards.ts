import { useSyncExternalStore } from "react";

import { getSetting, putSetting } from "../../../shared/lib/settings/actions";
import type { Page } from "../../courses/lib/page/types";
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

export async function makeFlashcards(
  moduleId: number,
  pages: Pick<Page, "id" | "title" | "content">[],
  courseId?: number
) {
  const current = making.get(moduleId);
  if (current && current.done < current.total) return;
  const worthMaking = pages.filter((page) => (page.content ?? "").replace(/<[^>]+>/g, "").trim().length > 80);
  if (worthMaking.length === 0) return;
  making.set(moduleId, { done: 0, total: worthMaking.length, error: "" });
  notify();
  for (const [index, page] of worthMaking.entries()) {
    try {
      await addCards(moduleId, await suggestFlashcards([page], courseId));
      making.set(moduleId, { ...(making.get(moduleId) as Making), done: index + 1 });
    } catch (error) {
      making.set(moduleId, {
        done: worthMaking.length,
        total: worthMaking.length,
        error: error instanceof Error ? error.message : "Couldn’t make flashcards. Try again."
      });
      notify();
      return;
    }
    notify();
  }
}

export async function makeFlashcardsForImport(moduleId: number, page: Pick<Page, "id" | "title" | "content">, courseId?: number) {
  if (await makesCardsForImports()) await makeFlashcards(moduleId, [page], courseId);
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
