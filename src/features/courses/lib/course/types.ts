import type { CompletionStatus } from "@/features/courses/lib/completion-status";

export type Course = {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  status: CompletionStatus;
  progress: number;
  bookmarked: boolean;
  ai_profile_id: number | null;
  cover: string | null;
  position: number;
  code: string | null;
  semester: string | null;
  school: string | null;
  instructor: string | null;
  created_at: string;
  updated_at: string;
};

export type CourseInput = {
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  status?: CompletionStatus;
  progress?: number;
  bookmarked?: boolean;
  ai_profile_id?: number | null;
  cover?: string | null;
  code?: string | null;
  semester?: string | null;
  school?: string | null;
  instructor?: string | null;
};

export type CourseFilter = {
  status?: CompletionStatus;
  bookmarked?: boolean;
  createdFrom?: string;
  createdTo?: string;
};

export function courseDetails({ code, semester, school, instructor }: Course) {
  return [code, semester, school, instructor].filter(Boolean).join(" · ");
}

export function pinnedFirst(courses: Course[]) {
  return {
    pinned: courses.filter((course) => course.bookmarked),
    others: courses.filter((course) => !course.bookmarked)
  };
}

export function withGroupOrder(courses: Course[], group: Course[]) {
  const pinned = group[0]?.bookmarked ?? false;
  const rest = courses.filter((course) => course.bookmarked !== pinned);
  return pinned ? [...group, ...rest] : [...rest, ...group];
}
