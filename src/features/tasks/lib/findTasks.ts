import { runOnce } from "@/features/agent-chat/lib/runTurn";
import { getActionConnection } from "@/features/ai-actions/lib/action/actions";
import { detectContent, pageOutline, type DueDate } from "@/features/courses/lib/content-detection";
import { getPages } from "@/features/courses/lib/page/actions";
import type { Page } from "@/features/courses/lib/page/types";

import { activityType, pageTaskType } from "./fromImport";
import { addTasks, getModuleTaskTitles } from "./task/actions";
import { TaskType } from "./task/types";

export type TaskCandidate = {
  title: string;
  type: TaskType;
  due_on: string | null;
  page: { id: number; title: string };
  byAi: boolean;
};

export type FoundTasks = { candidates: TaskCandidate[]; existing: string[] };

const AI_BUDGET_CHARS = 60_000;
const AI_PAGE_CHARS = 3000;

const framing =
  "You are reading a student's course pages inside mneme, a study notes app, to list the work they have to do. This is not a software task: do not read, search, or change any files on this machine, and do not use any tools.";

const aiTypes: Record<string, TaskType> = {
  exercise: TaskType.Exercise,
  discussion: TaskType.Discussion,
  assignment: TaskType.Assignment,
  quiz: TaskType.Quiz
};

const titleKey = (title: string) => title.replace(/\s+/g, " ").trim().toLowerCase();

const shortTitle = (title: string) => titleKey(title.split(/[:–—]/)[0]);

// Drops a bare heading ("EXERCISES") and a link named only by its address.
function looksLikeTask(name: string) {
  return /\s/.test(name.trim()) && !/https?:\/\//i.test(name);
}

function earliest(dueDates: DueDate[]) {
  return (
    dueDates.flatMap(({ date }) => (date ? [date] : [])).sort((a, b) => a.localeCompare(b))[0] ??
    null
  );
}

export function pageCandidates(
  page: Pick<Page, "id" | "title" | "type" | "content">,
  today = new Date()
): TaskCandidate[] {
  const detected = detectContent(page.title, page.content ?? "", { today });
  const source = { id: page.id, title: page.title };
  const candidates: TaskCandidate[] = [];
  const pageType = pageTaskType(page.type, detected.kind);
  if (pageType)
    candidates.push({
      title: page.title,
      type: pageType,
      due_on: earliest(detected.dueDates),
      page: source,
      byAi: false
    });
  for (const name of detected.activities) {
    const shortName = shortTitle(name);
    if (!looksLikeTask(name) || (pageType && shortName === shortTitle(page.title))) continue;
    const named = detected.dueDates.filter((due) => titleKey(due.text).includes(shortName));
    candidates.push({
      title: name,
      type: activityType(name),
      due_on: earliest(named),
      page: source,
      byAi: false
    });
  }
  return candidates;
}

// Keeps the first candidate of each title, and drops titles already in `taken`.
export function newCandidates(candidates: TaskCandidate[], taken: string[]) {
  const seen = new Set(taken.map(titleKey));
  return candidates.filter((candidate) => {
    const key = titleKey(candidate.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function findModuleTasks(moduleId: number): Promise<FoundTasks> {
  const [pages, existing] = await Promise.all([getPages(moduleId), getModuleTaskTitles(moduleId)]);
  const found = pages.flatMap((page) => pageCandidates(page));
  const offered = newCandidates(found, existing);
  const existingKeys = new Set(existing.map(titleKey));
  const alreadyTasks = new Set(
    found.map((candidate) => titleKey(candidate.title)).filter((key) => existingKeys.has(key))
  );
  return { candidates: offered, existing: [...alreadyTasks] };
}

export function parseAiTasks(answer: string, pages: Pick<Page, "id" | "title">[]): TaskCandidate[] {
  const start = answer.indexOf("[");
  const end = answer.lastIndexOf("]");
  if (start === -1 || end < start) return [];
  let items: unknown;
  try {
    items = JSON.parse(answer.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(items)) return [];
  return items.flatMap(
    (item: { title?: unknown; type?: unknown; page?: unknown; due?: unknown }) => {
      const page = typeof item.page === "number" ? pages[item.page - 1] : undefined;
      if (typeof item.title !== "string" || !item.title.trim() || !page) return [];
      const due =
        typeof item.due === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.due) ? item.due : null;
      const type = aiTypes[String(item.type).toLowerCase()] ?? TaskType.Exercise;
      return [
        {
          title: item.title.trim(),
          type,
          due_on: due,
          page: { id: page.id, title: page.title },
          byAi: true
        }
      ];
    }
  );
}

// The page a task came from often is the task (a Discussion page), and
// the agent tends to rename it ("Industry challenge post").
export function withoutRenamedPageTasks(found: TaskCandidate[], known: TaskCandidate[]) {
  return found.filter(
    (candidate) =>
      !known.some(
        (item) =>
          item.page.id === candidate.page.id &&
          item.type === candidate.type &&
          titleKey(item.title) === titleKey(item.page.title)
      )
  );
}

export async function findModuleTasksWithAi(
  moduleId: number,
  known: TaskCandidate[],
  today = new Date()
): Promise<TaskCandidate[]> {
  const connection = await getActionConnection();
  if (!connection) throw new Error("No agent connected yet. Add one in Chat, then try again.");
  const pages = await getPages(moduleId);
  if (!pages.length) return [];
  const perPage = Math.min(AI_PAGE_CHARS, Math.floor(AI_BUDGET_CHARS / pages.length));
  const listed = pages
    .map((page, index) => `[${index + 1}]\n${pageOutline(page.title, page.content ?? "", perPage)}`)
    .join("\n\n");
  const already = known.length
    ? ` These are already listed, so don't repeat them, even under another name: ${known.map((item) => `"${item.title}" (page "${item.page.title}")`).join(", ")}.`
    : "";
  const question = `Today is ${today.toDateString()}. Below are the pages of one module of a student's course, numbered. List the work the pages ask the student to do: assignments, quizzes, discussions and exercises they hand in or take part in. Leave out topics, readings and anything that only explains.${already} Reply with only a JSON array, no other text: [{"title": "short name of the task", "type": "assignment" | "quiz" | "discussion" | "exercise", "page": <number of the page it's on>, "due": "YYYY-MM-DD" or null}]. Reply [] when there's none.\n\n${listed}`;
  return new Promise((resolve, reject) => {
    runOnce(connection, question, framing, null, (event) => {
      if (event.type === "error") reject(new Error(event.message));
      if (event.type === "done")
        resolve(withoutRenamedPageTasks(parseAiTasks(event.text, pages), known));
    }).catch(() =>
      reject(new Error(`Couldn’t start ${connection.name}. Check it’s installed and try again.`))
    );
  });
}

export async function addFoundTasks(
  candidates: TaskCandidate[],
  courseId: number,
  moduleId: number
) {
  await addTasks(
    candidates.map((candidate) => ({
      title: candidate.title,
      type: candidate.type,
      course_id: courseId,
      module_id: moduleId,
      page_id: candidate.page.id,
      due_on: candidate.due_on
    }))
  );
}
