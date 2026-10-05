import type { TaskRow } from "../../../../shared/lib/db/schema/task";

export enum TaskType {
  Exercise = 1,
  Discussion = 2,
  Assignment = 3,
  Quiz = 4,
  Personal = 5
}

export const taskTypeLabels: Record<TaskType, string> = {
  [TaskType.Exercise]: "Exercise",
  [TaskType.Discussion]: "Discussion",
  [TaskType.Assignment]: "Assignment",
  [TaskType.Quiz]: "Quiz",
  [TaskType.Personal]: "Personal"
};

export const taskTypeOptions = Object.entries(taskTypeLabels).map(([value, label]) => ({
  value: Number(value) as TaskType,
  label
}));

export type Task = Omit<TaskRow, "type"> & {
  type: TaskType;
  course_name: string | null;
  module_name: string | null;
  page_title: string | null;
};

export type TaskDraft = {
  title: string;
  type: TaskType;
  course_id: number | null;
  module_id: number | null;
  page_id?: number | null;
  due_on: string | null;
};

export type TaskFilter = { courseId?: number; open?: boolean };

export type TaskGroup = "overdue" | "today" | "week" | "later" | "undated" | "done";

export const taskGroupLabels: Record<TaskGroup, string> = {
  overdue: "Overdue",
  today: "Today",
  week: "This week",
  later: "Later",
  undated: "No due date",
  done: "Done"
};

export function localDay(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function addDays(day: string, days: number) {
  const date = new Date(`${day}T00:00:00`);
  date.setDate(date.getDate() + days);
  return localDay(date);
}

export function taskGroup(task: Pick<Task, "due_on" | "completed_at">, today: string): TaskGroup {
  if (task.completed_at) return "done";
  if (!task.due_on) return "undated";
  if (task.due_on < today) return "overdue";
  if (task.due_on === today) return "today";
  return task.due_on <= addDays(today, 7) ? "week" : "later";
}

const dueFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short" });

export function dueLabel(dueOn: string, today: string) {
  if (dueOn === today) return "Due today";
  if (dueOn === addDays(today, 1)) return "Due tomorrow";
  if (dueOn === addDays(today, -1)) return "Due yesterday";
  return `Due ${dueFormat.format(new Date(`${dueOn}T00:00:00`))}`;
}

export function compareTasks(a: Task, b: Task) {
  if (a.due_on !== b.due_on) {
    if (!a.due_on) return 1;
    if (!b.due_on) return -1;
    return a.due_on.localeCompare(b.due_on);
  }
  return a.id - b.id;
}
