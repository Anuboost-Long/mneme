import { CompletionStatus, completionStatusLabels } from "../lib/completion-status";
import { pageContentPreview, PageType, type Page } from "../lib/pages";
import type { ItemAction } from "./ItemMenu";
import { pageTypeLabels } from "./PageForm";

// What a page list row and a gallery card both show and do.

const WORDS_PER_MINUTE = 220;

export const typeGlyphs: Record<PageType, string> = {
  [PageType.Lesson]: "M12 6C10 4.5 7 4 4 4.5v14C7 18 10 18.5 12 20m0-14c2-1.5 5-2 8-1.5v14c-3-.5-6 0-8 1.5m0-14v14",
  [PageType.Lecture]: "M4 5h16v11H4zM9 20h6M12 16v4M10.5 8.5v4l3.5-2-3.5-2Z",
  [PageType.Exercise]: "m15 5 4 4M4 20l1-4L16 5l3 3-11 11-4 1Z",
  [PageType.Discussion]: "M4 5h16v10H9l-5 4V5Z",
  [PageType.Assignment]: "M9 4h6v3H9zM7 5.5H5v15h14v-15h-2M9 13l2 2 4-4",
  [PageType.Notes]: "M5 4h14v11l-5 5H5V4Zm9 16v-5h5M8 9h8M8 12h5",
  [PageType.Reading]: "M4 5h16M4 10h16M4 15h10M4 20h7",
  [PageType.Revision]: "M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4",
  [PageType.Custom]: "M12 3l9 9-9 9-9-9 9-9Z",
};

export function readingTime(content: string | null) {
  const text = pageContentPreview(content);
  if (!text) return "Empty";
  return `${Math.max(1, Math.round(text.split(" ").length / WORDS_PER_MINUTE))} min`;
}

// In progress and Revision needed are worth a word; Done and Not started
// already show in the tick box.
const inBetween = new Set([CompletionStatus.InProgress, CompletionStatus.RevisionNeeded]);

// "Lesson", or "Lesson · In progress".
export function pageMeta(page: Page) {
  return inBetween.has(page.status) ? `${pageTypeLabels[page.type]} · ${completionStatusLabels[page.status]}` : pageTypeLabels[page.type];
}

export type PageItemProps = {
  page: Page;
  courseColor: string | null;
  to: string;
  onToggleDone: () => void;
  onEdit: () => void;
  onDelete: () => void;
  actions?: ItemAction[];
  selectable: boolean;
  selected: boolean;
  onToggleSelect: () => void;
};
