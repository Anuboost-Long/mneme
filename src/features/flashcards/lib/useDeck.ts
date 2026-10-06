import { getModule } from "@/features/courses/lib/module/actions";
import type { Module } from "@/features/courses/lib/module/types";
import { getPages } from "@/features/courses/lib/page/actions";
import type { Page } from "@/features/courses/lib/page/types";
import { useCallback, useEffect, useState } from "react";

import { getDeckCards } from "./card/actions";
import type { Flashcard } from "./card/types";

export function useDeck(moduleId: number) {
  const [module, setModule] = useState<Module>();
  const [pages, setPages] = useState<Page[]>([]);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [ready, setReady] = useState(false);

  const reload = useCallback(async () => {
    const [loadedModule, loadedPages, loadedCards] = await Promise.all([
      getModule(moduleId),
      getPages(moduleId),
      getDeckCards(moduleId)
    ]);
    setModule(loadedModule);
    setPages(loadedPages);
    setCards(loadedCards);
    setReady(true);
  }, [moduleId]);

  useEffect(() => {
    setReady(false);
    void reload();
  }, [reload]);

  return { module, pages, cards, ready, reload };
}
