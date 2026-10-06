import { useCallback, useEffect, useState } from "react";

import { getModule } from "@/features/courses/lib/module/actions";
import type { Module } from "@/features/courses/lib/module/types";
import { getPages } from "@/features/courses/lib/page/actions";
import type { Page } from "@/features/courses/lib/page/types";

import { getModuleQuizzes } from "./quiz/actions";
import type { Quiz } from "./quiz/types";

export function useModuleQuizzes(moduleId: number) {
  const [module, setModule] = useState<Module>();
  const [pages, setPages] = useState<Page[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const [loadedModule, loadedPages, loadedQuizzes] = await Promise.all([
      getModule(moduleId),
      getPages(moduleId),
      getModuleQuizzes(moduleId)
    ]);
    setModule(loadedModule);
    setPages(loadedPages);
    setQuizzes(loadedQuizzes);
    setReady(true);
  }, [moduleId]);

  useEffect(() => {
    setReady(false);
    void reload();
  }, [reload]);

  return { module, pages, quizzes, ready, reload };
}
