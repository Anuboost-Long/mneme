import { desktop } from "@chain/sdk";
import type { PageRow } from "../../../shared/lib/db/schema/page";
import { CompletionStatus } from "./completion-status";

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
  return page;
}

export async function updatePage(id: number, input: Partial<PageInput>) {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (input.title !== undefined) { fields.push("title = ?"); values.push(pageTitle(input.title)); }
  if (input.type !== undefined) { fields.push("type = ?"); values.push(input.type); }
  if (input.content !== undefined) { fields.push("content = ?"); values.push(input.content?.trim() || null); }
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
  return page;
}

export async function deletePage(id: number) {
  await desktop.storage.execute("DELETE FROM page WHERE id = ?", [id]);
}
