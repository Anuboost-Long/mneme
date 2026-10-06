import type { CompletionStatus } from "@/features/courses/lib/completion-status";
import type { PageType } from "@/features/courses/lib/page/types";

export type RecentPage = {
  id: number;
  title: string;
  type: PageType;
  icon: string | null;
  status: CompletionStatus;
  module_id: number;
  module_name: string;
  course_id: number;
  course_name: string;
  course_color: string | null;
  seen_at: string;
};

export type OpenModule = {
  id: number;
  name: string;
  icon: string | null;
  course_id: number;
  course_name: string;
  course_color: string | null;
  total: number;
  done: number;
};

export type PageFilter = { courseId?: number; type?: PageType; status?: CompletionStatus };

export const pageSorts = {
  opened: "Last opened",
  edited: "Last edited",
  created: "Newest",
  title: "Title"
} as const;

export type PageSort = keyof typeof pageSorts;

export type RecentRecording = {
  id: number;
  name: string;
  duration_ms: number;
  created_at: string;
  page_id: number | null;
  page_title: string | null;
  module_id: number | null;
  course_id: number | null;
};

export type RecentHighlight = {
  id: number;
  html: string;
  created_at: string;
  page_id: number;
  page_title: string;
  module_id: number;
  course_id: number;
};

export type ShelfCourse = {
  id: number;
  name: string;
  color: string | null;
  pages: number;
  done: number;
};
