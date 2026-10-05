import type { ContentKind, DueDate } from "../../courses/lib/content-detection";
import { PageType } from "../../courses/lib/page/types";
import { addTasks, getModuleTaskTitles } from "./task/actions";
import { TaskType, type TaskDraft } from "./task/types";

const NAME_TYPES: [RegExp, TaskType][] = [
  [/^(assignment|assessment|project|homework|problem set)/i, TaskType.Assignment],
  [/^(quiz|knowledge check)/i, TaskType.Quiz],
  [/^(discussion|forum|reflection)/i, TaskType.Discussion]
];

const PAGE_TASK_TYPES: Partial<Record<number, TaskType>> = {
  [PageType.Assignment]: TaskType.Assignment,
  [PageType.Discussion]: TaskType.Discussion,
  [PageType.Exercise]: TaskType.Exercise
};

export function pageTaskType(pageType: number, kind?: ContentKind) {
  if (pageType === PageType.Exercise && kind === "quiz") return TaskType.Quiz;
  return PAGE_TASK_TYPES[pageType] ?? null;
}

export function activityType(name: string) {
  return NAME_TYPES.find(([pattern]) => pattern.test(name.trim()))?.[1] ?? TaskType.Exercise;
}

export function importedTasks({
  page,
  pageTask,
  activities,
  dueDates,
  courseId,
  moduleId,
  existingTitles
}: {
  page: { id: number; title: string };
  pageTask: TaskType | null;
  activities: string[];
  dueDates: DueDate[];
  courseId: number;
  moduleId: number;
  existingTitles: string[];
}): TaskDraft[] {
  const taken = new Set(existingTitles.map((title) => title.trim().toLowerCase()));
  const drafts: TaskDraft[] = [];
  const add = (title: string, type: TaskType, dueOn: string | null) => {
    const key = title.trim().toLowerCase();
    if (!key || taken.has(key)) return;
    taken.add(key);
    drafts.push({ title: title.trim(), type, course_id: courseId, module_id: moduleId, page_id: page.id, due_on: dueOn });
  };
  if (pageTask) {
    const earliest = dueDates.flatMap(({ date }) => (date ? [date] : [])).sort()[0] ?? null;
    add(page.title, pageTask, earliest);
  }
  for (const name of activities) add(name, activityType(name), null);
  return drafts;
}

export async function addImportedTasks(input: Omit<Parameters<typeof importedTasks>[0], "existingTitles">) {
  const drafts = importedTasks({ ...input, existingTitles: await getModuleTaskTitles(input.moduleId) });
  if (drafts.length > 0) await addTasks(drafts);
  return drafts.length;
}
