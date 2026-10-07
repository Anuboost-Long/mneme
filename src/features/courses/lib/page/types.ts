import type { CompletionStatus } from "@/features/courses/lib/completion-status";

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

export const pageTypeLabels: Record<PageType, string> = {
  [PageType.Lesson]: "Lesson",
  [PageType.Lecture]: "Lecture",
  [PageType.Exercise]: "Exercise",
  [PageType.Discussion]: "Discussion",
  [PageType.Assignment]: "Assignment",
  [PageType.Notes]: "Notes",
  [PageType.Reading]: "Reading",
  [PageType.Revision]: "Revision",
  [PageType.Custom]: "Custom"
};

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
  source: string | null;
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
  source?: string | null;
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
