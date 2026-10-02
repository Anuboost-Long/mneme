import type { CompletionStatus } from "../completion-status";

// Numeric, not string, values — see completion-status.ts for why.
export enum PageType {
  Lesson = 1,
  Lecture = 2,
  Exercise = 3,
  Discussion = 4,
  Assignment = 5,
  Notes = 6,
  Reading = 7,
  Revision = 8,
  Custom = 9
}

// A numeric enum's `Object.values()` also reverse-maps names to numbers,
// so callers that need every type as a plain list (a `<select>`'s
// options, for example) use this instead of `Object.values`.
export const pageTypes: PageType[] = [
  PageType.Lesson,
  PageType.Lecture,
  PageType.Exercise,
  PageType.Discussion,
  PageType.Assignment,
  PageType.Notes,
  PageType.Reading,
  PageType.Revision,
  PageType.Custom
];

export type Page = {
  id: number;
  module_id: number;
  title: string;
  type: PageType;
  content: string | null;
  status: CompletionStatus;
  progress: number;
  bookmarked: boolean;
  icon: string | null;
  cover: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type PageInput = {
  title: string;
  type?: PageType;
  icon?: string | null;
  cover?: string | null;
  content?: string | null;
  status?: CompletionStatus;
  progress?: number;
  bookmarked?: boolean;
};

export type PageFilter = {
  type?: PageType;
  status?: CompletionStatus;
  bookmarked?: boolean;
  createdFrom?: string;
  createdTo?: string;
};

export type PageProgress = { total: number; done: number };

export type PageLink = {
  id: number;
  title: string;
  module_id: number;
  module_name: string;
  course_id: number;
  in_title: number;
};

export function pageContentPreview(html: string | null) {
  return (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function percentDone(progress: PageProgress | undefined) {
  return progress?.total ? Math.round((progress.done / progress.total) * 100) : 0;
}
