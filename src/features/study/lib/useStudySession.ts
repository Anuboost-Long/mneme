import { getModule } from "@/features/courses/lib/module/actions";
import type { Module } from "@/features/courses/lib/module/types";
import { getPages } from "@/features/courses/lib/page/actions";
import type { Page } from "@/features/courses/lib/page/types";
import { getDueCards } from "@/features/flashcards/lib/card/actions";
import type { Flashcard } from "@/features/flashcards/lib/card/types";
import { getQuestions } from "@/features/quizzes/lib/quiz/actions";
import type { Question } from "@/features/quizzes/lib/quiz/types";
import { useCallback, useEffect, useState } from "react";

import { getSession } from "./session/actions";
import type { StudySession } from "./session/types";

const SESSION_CARDS = 20;

export function useStudySession(moduleId: number, sessionId: number) {
  const [module, setModule] = useState<Module>();
  const [pages, setPages] = useState<Page[]>([]);
  const [session, setSession] = useState<StudySession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [dueCards, setDueCards] = useState<Flashcard[]>([]);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const [loadedModule, loadedPages, loadedSession, loadedCards] = await Promise.all([
      getModule(moduleId),
      getPages(moduleId),
      getSession(sessionId),
      getDueCards(moduleId)
    ]);
    const owned = loadedSession?.module_id === moduleId ? loadedSession : null;
    setModule(loadedModule);
    setPages(loadedPages);
    setSession(owned);
    setQuestions(owned?.quiz_id ? await getQuestions(owned.quiz_id) : []);
    setDueCards(loadedCards.slice(0, SESSION_CARDS));
    setReady(true);
  }, [moduleId, sessionId]);

  useEffect(() => {
    setReady(false);
    void reload();
  }, [reload]);

  return { module, pages, session, questions, dueCards, ready, reload };
}
