import { getModule } from "@/features/courses/lib/module/actions";
import type { Module } from "@/features/courses/lib/module/types";
import { getPages } from "@/features/courses/lib/page/actions";
import type { Page } from "@/features/courses/lib/page/types";
import { getDeckCards } from "@/features/flashcards/lib/card/actions";
import type { Flashcard } from "@/features/flashcards/lib/card/types";
import { getQuiz } from "@/features/quizzes/lib/quiz/actions";
import type { Quiz } from "@/features/quizzes/lib/quiz/types";
import { findModuleTasks } from "@/features/tasks/lib/findTasks";
import { useCallback, useEffect, useState } from "react";

import { getFreshDigestPageIds, getModulePrep } from "./prep/actions";
import type { ModulePrep } from "./prep/types";

export function usePrepare(moduleId: number) {
  const [module, setModule] = useState<Module>();
  const [pages, setPages] = useState<Page[]>([]);
  const [prep, setPrep] = useState<ModulePrep | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [newTasks, setNewTasks] = useState(0);
  const [condensed, setCondensed] = useState(new Set<number>());
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const [loadedModule, loadedPages, loadedPrep, loadedCards, found, digested] = await Promise.all(
      [
        getModule(moduleId),
        getPages(moduleId),
        getModulePrep(moduleId),
        getDeckCards(moduleId),
        findModuleTasks(moduleId),
        getFreshDigestPageIds(moduleId)
      ]
    );
    setModule(loadedModule);
    setPages(loadedPages);
    setPrep(loadedPrep);
    setCards(loadedCards);
    setQuiz(loadedPrep?.quiz_id ? await getQuiz(loadedPrep.quiz_id) : null);
    setNewTasks(found.candidates.length);
    setCondensed(digested);
    setReady(true);
  }, [moduleId]);

  useEffect(() => {
    setReady(false);
    void reload();
  }, [reload]);

  return { module, pages, prep, cards, quiz, newTasks, condensed, ready, reload };
}
