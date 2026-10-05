import { deleteTaskRow, insertTasks, setTaskCompleted, updateTaskRow } from "./table";
import type { TaskDraft } from "./types";

export { deleteOrphanTasks, getModuleTaskTitles, getTasks } from "./table";

function checked(draft: TaskDraft): TaskDraft {
  const title = draft.title.trim();
  if (!title) throw new Error("Give the task a name, like “Assignment 1: Risk report”.");
  if (draft.due_on && !/^\d{4}-\d{2}-\d{2}$/.test(draft.due_on))
    throw new Error("Choose the due date from the calendar, or leave it empty.");
  return { ...draft, title, due_on: draft.due_on || null };
}

export async function addTasks(drafts: TaskDraft[]) {
  await insertTasks(drafts.map(checked));
}

export async function editTask(id: number, draft: TaskDraft) {
  await updateTaskRow(id, checked(draft));
}

export async function completeTask(id: number, done: boolean) {
  await setTaskCompleted(id, done);
}

export async function deleteTask(id: number) {
  await deleteTaskRow(id);
}
