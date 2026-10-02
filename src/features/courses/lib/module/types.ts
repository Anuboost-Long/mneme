import type { CompletionStatus } from "../completion-status";

export {
  CompletionStatus as ModuleStatus,
  completionStatuses as moduleStatuses,
  completionStatusLabels as moduleStatusLabels
} from "../completion-status";

export type Module = {
  id: number;
  course_id: number;
  name: string;
  description: string | null;
  status: CompletionStatus;
  progress: number;
  bookmarked: boolean;
  icon: string | null;
  position: number;
  created_at: string;
  updated_at: string;
};

export type ModuleInput = {
  name: string;
  description?: string | null;
  icon?: string | null;
  status?: CompletionStatus;
  progress?: number;
  bookmarked?: boolean;
};

export type ModuleFilter = {
  status?: CompletionStatus;
  bookmarked?: boolean;
  createdFrom?: string;
  createdTo?: string;
};

export type ModuleLink = { id: number; name: string; course_id: number; course_name: string };
