import { getModule } from "@/features/courses/lib/module/actions";
import type { Module } from "@/features/courses/lib/module/types";
import { getPages } from "@/features/courses/lib/page/actions";
import type { Page } from "@/features/courses/lib/page/types";
import { useCallback, useEffect, useState } from "react";

import { getModuleSessions } from "./session/actions";
import type { StudySession } from "./session/types";

export function useStudySessions(moduleId: number) {
  const [module, setModule] = useState<Module>();
  const [pages, setPages] = useState<Page[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const [loadedModule, loadedPages, loadedSessions] = await Promise.all([
      getModule(moduleId),
      getPages(moduleId),
      getModuleSessions(moduleId)
    ]);
    setModule(loadedModule);
    setPages(loadedPages);
    setSessions(loadedSessions);
    setReady(true);
  }, [moduleId]);

  useEffect(() => {
    setReady(false);
    void reload();
  }, [reload]);

  return { module, pages, sessions, ready, reload };
}
