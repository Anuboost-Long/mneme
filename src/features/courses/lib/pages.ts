import { desktop } from "@chain/sdk";
import type { PageRow } from "../../../shared/lib/db/schema/page";
import { CompletionStatus } from "./completion-status";
import { reconcileHighlights, syncPageHighlights } from "./highlights";

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
  Custom = 9,
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
  PageType.Custom,
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
  created_at: string;
  updated_at: string;
};

export type PageInput = {
  title: string;
  type?: PageType;
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

function pageTitle(title: string) {
  if (!title.trim()) throw new Error("Enter a page title.");
  return title.trim();
}

function clampProgress(progress: number) {
  return Math.min(100, Math.max(0, Math.round(progress)));
}

export function pageContentPreview(html: string | null) {
  return (html || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function toPage(row: PageRow): Page {
  return { ...row, type: row.type as PageType, status: row.status as CompletionStatus, bookmarked: Boolean(row.bookmarked) };
}

// The highlight table is a derived index of a page's own content, not the
// content itself — a page's content is what the user was actually trying
// to save, so a sync failure here (a stale schema mid-migration, a
// transient storage error) must not make that save look like it failed
// too. The next successful save of this page re-syncs from scratch anyway.
async function syncHighlightsSafely(pageId: number, moduleId: number, content: string | null) {
  try {
    await syncPageHighlights(pageId, moduleId, content);
  } catch (error) {
    console.error("Couldn't sync highlights for page", pageId, error);
  }
}

// Same reasoning as syncHighlightsSafely — reconciling highlights before
// a save is a best-effort improvement to what gets written, not a
// requirement of the save succeeding.
function reconcileHighlightsSafely(previousContent: string | null, nextContent: string | null): string | null {
  try {
    return reconcileHighlights(previousContent, nextContent);
  } catch (error) {
    console.error("Couldn't reconcile highlights before saving page", error);
    return nextContent;
  }
}

export async function getPages(moduleId: number, filter: PageFilter = {}) {
  const conditions = ["module_id = ?"];
  const params: (string | number)[] = [moduleId];
  if (filter.type !== undefined) { conditions.push("type = ?"); params.push(filter.type); }
  if (filter.status !== undefined) { conditions.push("status = ?"); params.push(filter.status); }
  if (filter.bookmarked !== undefined) { conditions.push("bookmarked = ?"); params.push(filter.bookmarked ? 1 : 0); }
  if (filter.createdFrom !== undefined) { conditions.push("date(created_at) >= date(?)"); params.push(filter.createdFrom); }
  if (filter.createdTo !== undefined) { conditions.push("date(created_at) <= date(?)"); params.push(filter.createdTo); }
  const rows = await desktop.storage.query<PageRow>(
    `SELECT * FROM page WHERE ${conditions.join(" AND ")} ORDER BY created_at, id`,
    params,
  );
  return rows.map(toPage);
}

export type PageProgress = { total: number; done: number };

export function percentDone(progress: PageProgress | undefined) {
  return progress?.total ? Math.round((progress.done / progress.total) * 100) : 0;
}

async function queryPageProgress(key: "id" | "course_id", where: string, params: number[]) {
  const rows = await desktop.storage.query<{ key: number; total: number; done: number }>(
    `SELECT module.${key} AS key, COUNT(*) AS total, SUM(page.status = ?) AS done
     FROM page JOIN module ON module.id = page.module_id ${where} GROUP BY module.${key}`,
    [CompletionStatus.Completed, ...params],
  );
  return new Map(rows.map((row): [number, PageProgress] => [row.key, { total: row.total, done: row.done ?? 0 }]));
}

export function getModulePageProgress(courseId: number) {
  return queryPageProgress("id", "WHERE module.course_id = ?", [courseId]);
}

export function getCoursePageProgress() {
  return queryPageProgress("course_id", "", []);
}

export async function searchPages(query: string) {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const like = `%${trimmed}%`;
  const rows = await desktop.storage.query<PageRow>(
    "SELECT * FROM page WHERE title LIKE ? OR content LIKE ? ORDER BY created_at, id",
    [like, like],
  );
  return rows.map(toPage);
}

export type PageLink = { id: number; title: string; module_id: number; module_name: string; course_id: number; in_title: number };

export function searchPageLinks(query: string, limit: number) {
  const trimmed = query.trim().replace(/[\\%_]/g, "\\$&");
  const like = `%${trimmed}%`;
  return desktop.storage.query<PageLink>(
    `SELECT page.id, page.title, page.module_id, module.name AS module_name, module.course_id,
       page.title LIKE ? ESCAPE '\\' AS in_title
     FROM page JOIN module ON module.id = page.module_id
     WHERE page.title LIKE ? ESCAPE '\\' OR page.content LIKE ? ESCAPE '\\'
     ORDER BY in_title DESC, page.title LIKE ? ESCAPE '\\' DESC, page.title COLLATE NOCASE LIMIT ?`,
    [like, like, like, `${trimmed}%`, limit],
  );
}

export async function getPage(id: number) {
  const [row] = await desktop.storage.query<PageRow>("SELECT * FROM page WHERE id = ?", [id]);
  return row ? toPage(row) : undefined;
}

export async function createPage(moduleId: number, input: PageInput) {
  const result = await desktop.storage.execute(
    "INSERT INTO page (module_id, title, type, content, status, progress, bookmarked) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      moduleId,
      pageTitle(input.title),
      input.type ?? PageType.Lesson,
      input.content?.trim() || null,
      input.status ?? CompletionStatus.NotStarted,
      clampProgress(input.progress ?? 0),
      input.bookmarked ? 1 : 0,
    ],
  );
  const page = await getPage(result.lastInsertId);
  if (!page) throw new Error("The saved page could not be found.");
  if (page.content) await syncHighlightsSafely(page.id, moduleId, page.content);
  return page;
}

// `skipHighlightReconciliation` is for the one caller that already knows
// exactly which highlight it's removing (ModuleHighlightsPage's stripHighlight
// call): reconcileHighlights can't tell that apart from an unrelated edit
// leaving the same text untouched, and would otherwise re-wrap the very
// mark the user just asked to remove — see highlights.ts's reconcileHighlights.
export async function updatePage(id: number, input: Partial<PageInput>, options: { skipHighlightReconciliation?: boolean } = {}) {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (input.title !== undefined) { fields.push("title = ?"); values.push(pageTitle(input.title)); }
  if (input.type !== undefined) { fields.push("type = ?"); values.push(input.type); }
  let content: string | null | undefined;
  if (input.content !== undefined) {
    const trimmed = input.content?.trim() || null;
    if (options.skipHighlightReconciliation) {
      content = trimmed;
    } else {
      const previous = await getPage(id);
      content = reconcileHighlightsSafely(previous?.content ?? null, trimmed);
    }
    fields.push("content = ?");
    values.push(content);
  }
  if (input.status !== undefined) { fields.push("status = ?"); values.push(input.status); }
  if (input.progress !== undefined) { fields.push("progress = ?"); values.push(clampProgress(input.progress)); }
  if (input.bookmarked !== undefined) { fields.push("bookmarked = ?"); values.push(input.bookmarked ? 1 : 0); }
  if (fields.length) {
    await desktop.storage.execute(
      `UPDATE page SET ${fields.join(", ")}, updated_at = datetime('now') WHERE id = ?`,
      [...values, id],
    );
  }
  const page = await getPage(id);
  if (!page) throw new Error("This page no longer exists.");
  if (content !== undefined) await syncHighlightsSafely(page.id, page.module_id, page.content);
  return page;
}

export function setPageDone(id: number, done: boolean) {
  return updatePage(id, done
    ? { status: CompletionStatus.Completed, progress: 100 }
    : { status: CompletionStatus.NotStarted, progress: 0 });
}

export async function deletePage(id: number) {
  await desktop.storage.execute("DELETE FROM page WHERE id = ?", [id]);
}

export async function deletePages(ids: number[]) {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => "?").join(", ");
  await desktop.storage.execute(`DELETE FROM page WHERE id IN (${placeholders})`, ids);
}
