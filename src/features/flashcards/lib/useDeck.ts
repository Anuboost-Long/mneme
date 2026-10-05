import { useCallback, useEffect, useState } from "react";

import { getModule } from "../../courses/lib/module/actions";
import type { Module } from "../../courses/lib/module/types";
import { getPages } from "../../courses/lib/page/actions";
import type { Page } from "../../courses/lib/page/types";
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
