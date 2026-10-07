import { atom, useAtomValue, useSetAtom } from "jotai";

type PageSelection = { pageId: number; text: string };

const pageSelectionAtom = atom<PageSelection | null>(null);

export function useSetPageSelection() {
  return useSetAtom(pageSelectionAtom);
}

export function usePageSelection(pageId: number | null) {
  const selection = useAtomValue(pageSelectionAtom);
  return selection?.pageId === pageId ? selection.text : "";
}
