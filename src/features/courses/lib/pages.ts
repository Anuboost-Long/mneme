import { desktop } from "@chain/sdk";

import type { PageRow } from "../../../shared/lib/db/schema/page";
import { CompletionStatus } from "./completion-status";
import { reconcileHighlights, syncPageHighlights } from "./highlights";
import { deletePageAudios } from "../../audiobook/lib/pageAudio";
import { copyImage, deleteImage } from "./page-image";
import { recordStudy } from "../../../shared/lib/studyDays";
import { copyAttachments, deleteAttachments } from "./attachments";
import { copyRecordings, deleteRecordings } from "./recordings";

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

function pageTitle(title: string) {
  if (!title.trim()) throw new Error("Enter a page title.");
  return title.trim();
}

function clampProgress(progress: number) {
  return Math.min(100, Math.max(0, Math.round(progress)));
}

export function pageContentPreview(html: string | null) {
  return (html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toPage(row: PageRow): Page {
  return {
    ...row,
    type: row.type as PageType,
    status: row.status as CompletionStatus,
    bookmarked: Boolean(row.bookmarked)
  };
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
function reconcileHighlightsSafely(
  previousContent: string | null,
  nextContent: string | null
): string | null {
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
  if (filter.type !== undefined) {
    conditions.push("type = ?");
    params.push(filter.type);
  }
  if (filter.status !== undefined) {
    conditions.push("status = ?");
    params.push(filter.status);
  }
  if (filter.bookmarked !== undefined) {
    conditions.push("bookmarked = ?");
    params.push(filter.bookmarked ? 1 : 0);
  }
  if (filter.createdFrom !== undefined) {
    conditions.push("date(created_at) >= date(?)");
    params.push(filter.createdFrom);
  }
  if (filter.createdTo !== undefined) {
    conditions.push("date(created_at) <= date(?)");
    params.push(filter.createdTo);
  }
  const rows = await desktop.storage.query<PageRow>(
    `SELECT * FROM page WHERE ${conditions.join(" AND ")} ORDER BY position, created_at, id`,
    params
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
    [CompletionStatus.Completed, ...params]
  );
  return new Map(
    rows.map((row): [number, PageProgress] => [row.key, { total: row.total, done: row.done ?? 0 }])
  );
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
    [like, like]
  );
  return rows.map(toPage);
}

export type PageLink = {
  id: number;
  title: string;
  module_id: number;
  module_name: string;
  course_id: number;
  in_title: number;
};

export function searchPageLinks(query: string, limit: number) {
  const trimmed = query.trim().replace(/[\\%_]/g, "\\$&");
  const like = `%${trimmed}%`;
  return desktop.storage.query<PageLink>(
    `SELECT page.id, page.title, page.module_id, module.name AS module_name, module.course_id,
       page.title LIKE ? ESCAPE '\\' AS in_title
     FROM page JOIN module ON module.id = page.module_id
     WHERE page.title LIKE ? ESCAPE '\\' OR page.content LIKE ? ESCAPE '\\'
     ORDER BY in_title DESC, page.title LIKE ? ESCAPE '\\' DESC, page.title COLLATE NOCASE LIMIT ?`,
    [like, like, like, `${trimmed}%`, limit]
  );
}

export async function getPage(id: number) {
  const [row] = await desktop.storage.query<PageRow>("SELECT * FROM page WHERE id = ?", [id]);
  return row ? toPage(row) : undefined;
}

const nextPosition = "(SELECT COALESCE(MAX(position), 0) + 1 FROM page WHERE module_id = ?)";

// New pages go to the end of their module.
export async function createPage(moduleId: number, input: PageInput) {
  const result = await desktop.storage.execute(
    `INSERT INTO page (module_id, title, type, content, status, progress, bookmarked, icon, cover, position)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ${nextPosition})`,
    [
      moduleId,
      pageTitle(input.title),
      input.type ?? PageType.Lesson,
      input.content?.trim() || null,
      input.status ?? CompletionStatus.NotStarted,
      clampProgress(input.progress ?? 0),
      input.bookmarked ? 1 : 0,
      input.icon || null,
      input.cover ?? null,
      moduleId
    ]
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
export async function updatePage(
  id: number,
  input: Partial<PageInput>,
  options: { skipHighlightReconciliation?: boolean } = {}
) {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (input.title !== undefined) {
    fields.push("title = ?");
    values.push(pageTitle(input.title));
  }
  if (input.type !== undefined) {
    fields.push("type = ?");
    values.push(input.type);
  }
  if (input.icon !== undefined) {
    fields.push("icon = ?");
    values.push(input.icon?.trim() || null);
  }
  const replacedCover = input.cover === undefined ? null : (await getPage(id))?.cover;
  const finishing = input.status === CompletionStatus.Completed && (await getPage(id))?.status !== CompletionStatus.Completed;
  if (input.cover !== undefined) {
    fields.push("cover = ?");
    values.push(input.cover);
  }
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
  if (input.status !== undefined) {
    fields.push("status = ?");
    values.push(input.status);
  }
  if (input.progress !== undefined) {
    fields.push("progress = ?");
    values.push(clampProgress(input.progress));
  }
  if (input.bookmarked !== undefined) {
    fields.push("bookmarked = ?");
    values.push(input.bookmarked ? 1 : 0);
  }
  if (fields.length) {
    await desktop.storage.execute(
      `UPDATE page SET ${fields.join(", ")}, updated_at = datetime('now') WHERE id = ?`,
      [...values, id]
    );
  }
  if (finishing) await recordStudy("completed");
  if (replacedCover && replacedCover !== input.cover) await deleteImage(replacedCover);
  const page = await getPage(id);
  if (!page) throw new Error("This page no longer exists.");
  if (content !== undefined) await syncHighlightsSafely(page.id, page.module_id, page.content);
  return page;
}

// Adds `html` after the page's last block, for things filed from outside
// the editor (Home's recorder).
export async function appendToPage(id: number, html: string) {
  const page = await getPage(id);
  if (!page) throw new Error("This page no longer exists.");
  return updatePage(id, { content: `${page.content ?? ""}${html}` });
}

// Deletes a recording from outside its page (the Recordings screen): its
// audio and row, and its block in the page, so the page doesn't keep an
// empty "recording missing" block.
export async function deleteRecordingFromPage(recordingId: number, pageId: number) {
  await deleteRecordings("id = ?", [recordingId]);
  const page = await getPage(pageId);
  const content = page?.content?.replace(new RegExp(`<div data-recording-id="${recordingId}"[^>]*></div>`, "g"), "");
  if (page && content !== page.content) await updatePage(pageId, { content: content ?? null });
}

// For Home's recent pages. Leaves updated_at alone: opening isn't editing.
export async function markPageOpened(id: number) {
  await desktop.storage.execute("UPDATE page SET opened_at = datetime('now') WHERE id = ?", [id]);
  await recordStudy("opened");
}

// `ids` in their new order within one module.
export async function reorderPages(ids: number[]) {
  for (const [position, id] of ids.entries())
    await desktop.storage.execute("UPDATE page SET position = ? WHERE id = ?", [position + 1, id]);
}

// Moves a page to the end of another module, highlights included.
export async function movePage(id: number, moduleId: number) {
  await desktop.storage.execute(
    `UPDATE page SET module_id = ?, position = ${nextPosition}, updated_at = datetime('now') WHERE id = ?`,
    [moduleId, moduleId, id]
  );
  await desktop.storage.execute("UPDATE highlight SET module_id = ? WHERE page_id = ?", [moduleId, id]);
  const page = await getPage(id);
  if (!page) throw new Error("This page no longer exists.");
  return page;
}

// A copy right after the original, starting over as not started. It gets
// its own cover file, recordings and attachments, so deleting either page leaves the
// other whole. Downloaded page audio isn't copied; it can be made again.
export async function duplicatePage(id: number) {
  const original = await getPage(id);
  if (!original) throw new Error("This page no longer exists.");
  const copy = await createPage(original.module_id, {
    title: `${original.title} (copy)`,
    type: original.type,
    icon: original.icon,
    cover: original.cover ? await copyImage(original.cover) : null
  });
  const siblings = await getPages(original.module_id);
  const ordered = siblings.filter((page) => page.id !== copy.id);
  ordered.splice(ordered.findIndex((page) => page.id === original.id) + 1, 0, copy);
  await reorderPages(ordered.map((page) => page.id));
  const content = original.content ? await copyAttachments(await copyRecordings(original.content, copy.id), copy.id) : null;
  return content ? updatePage(copy.id, { content }) : ((await getPage(copy.id)) ?? copy);
}

export function setPageDone(id: number, done: boolean) {
  return updatePage(
    id,
    done
      ? { status: CompletionStatus.Completed, progress: 100 }
      : { status: CompletionStatus.NotStarted, progress: 0 }
  );
}

// Page, module and course deletes call this first, like deleteRecordings.
export async function deletePageCovers(filter: string, params: unknown[]) {
  const rows = await desktop.storage.query<{ cover: string | null }>(`SELECT cover FROM page WHERE ${filter}`, params);
  for (const { cover } of rows) if (cover) await deleteImage(cover);
}

export async function deletePage(id: number) {
  await deletePageCovers("id = ?", [id]);
  await deleteRecordings("page_id = ?", [id]);
  await deleteAttachments("page_id = ?", [id]);
  await deletePageAudios("page_id = ?", [id]);
  await desktop.storage.execute("DELETE FROM page WHERE id = ?", [id]);
}

export async function deletePages(ids: number[]) {
  if (ids.length === 0) return;
  const placeholders = ids.map(() => "?").join(", ");
  await deletePageCovers(`id IN (${placeholders})`, ids);
  await deleteRecordings(`page_id IN (${placeholders})`, ids);
  await deleteAttachments(`page_id IN (${placeholders})`, ids);
  await deletePageAudios(`page_id IN (${placeholders})`, ids);
  await desktop.storage.execute(`DELETE FROM page WHERE id IN (${placeholders})`, ids);
}
