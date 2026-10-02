import { desktop, sql, type Values } from "@chain/sdk";

import { savePositions } from "../../../../shared/lib/db/positions";
import type { HighlightRow } from "../../../../shared/lib/db/schema/highlight";
import type { PageRow } from "../../../../shared/lib/db/schema/page";
import { recordStudy } from "../../../../shared/lib/studyDays";
import { deletePageAudios } from "../../../audiobook/lib/pageAudio";
import { copyAttachments, deleteAttachments } from "../attachments";
import { CompletionStatus } from "../completion-status";
import { copyIcon, deleteIcon, deleteReplacedIcon, storeIcon } from "../course-image";
import { reconcileHighlights, syncPageHighlights } from "../highlights";
import { copyImage, deleteImage, storeInlineImages } from "../page-image";
import { copyRecordings, deleteRecordings } from "../recordings";
import { getPage, getPages, pageTable, toPage } from "./table";
import { PageType, type PageInput } from "./types";

function pageTitle(title: string) {
  if (!title.trim()) throw new Error("Enter a page title.");
  return title.trim();
}

function clampProgress(progress: number) {
  return Math.min(100, Math.max(0, Math.round(progress)));
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

async function pageContent(content: string | null | undefined) {
  const trimmed = content?.trim();
  return trimmed ? storeInlineImages(trimmed) : null;
}

// For pages saved before pictures were always stored as files. Writes only
// if the content hasn't changed meanwhile, so an edit made in the editor
// during the pass isn't overwritten.
export async function storeInlinePageImages() {
  const pages = await pageTable().where(sql`content LIKE '%src="data:image/%'`).all();
  for (const { id, content } of pages) {
    if (!content) continue;
    const stored = await storeInlineImages(content);
    if (stored !== content) await pageTable().update({ id, content }, { content: stored });
  }
}

const nextPosition = (moduleId: number) => sql`SELECT COALESCE(MAX(position), 0) + 1 FROM page WHERE module_id = ${moduleId}`;

// New pages go to the end of their module. Read back after inserting so
// opened_at, which page_opened_on_insert sets, is in the result.
export async function createPage(moduleId: number, input: PageInput) {
  const row = await pageTable().insert({
    module_id: moduleId,
    title: pageTitle(input.title),
    type: input.type ?? PageType.Lesson,
    content: await pageContent(input.content),
    status: input.status ?? CompletionStatus.NotStarted,
    progress: clampProgress(input.progress ?? 0),
    bookmarked: input.bookmarked ? 1 : 0,
    icon: await storeIcon(input.icon),
    cover: input.cover ?? null,
    position: nextPosition(moduleId)
  });
  const page = await getPage(row.id);
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
  const previous =
    input.icon !== undefined || input.cover !== undefined || input.status !== undefined || input.content !== undefined
      ? await getPage(id)
      : undefined;
  let content: string | null | undefined;
  if (input.content !== undefined) {
    const trimmed = await pageContent(input.content);
    content = options.skipHighlightReconciliation ? trimmed : reconcileHighlightsSafely(previous?.content ?? null, trimmed);
  }
  const changes: Values<PageRow> = {
    title: input.title === undefined ? undefined : pageTitle(input.title),
    type: input.type,
    icon: input.icon === undefined ? undefined : await storeIcon(input.icon),
    cover: input.cover,
    content,
    status: input.status,
    progress: input.progress === undefined ? undefined : clampProgress(input.progress),
    bookmarked: input.bookmarked === undefined ? undefined : Number(input.bookmarked)
  };
  const edited = Object.values(changes).some((value) => value !== undefined);
  const [row] = await pageTable().update({ id, deleted_at: null }, edited ? { ...changes, updated_at: sql`datetime('now')` } : {});
  if (!row) throw new Error("This page no longer exists.");
  const page = toPage(row);
  if (input.status === CompletionStatus.Completed && previous?.status !== CompletionStatus.Completed) await recordStudy("completed");
  if (previous?.cover && input.cover !== undefined && previous.cover !== input.cover) await deleteImage(previous.cover);
  if (input.icon !== undefined) await deleteReplacedIcon(previous?.icon, page.icon);
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
  await pageTable().update({ id }, { opened_at: sql`datetime('now')` });
  await recordStudy("opened");
}

// `ids` in their new order within one module.
export async function reorderPages(ids: number[]) {
  await savePositions("page", ids);
}

// Moves a page to the end of another module, highlights included.
export async function movePage(id: number, moduleId: number) {
  const [row] = await pageTable().update(
    { id, deleted_at: null },
    { module_id: moduleId, position: nextPosition(moduleId), updated_at: sql`datetime('now')` }
  );
  if (!row) throw new Error("This page no longer exists.");
  await desktop.storage.table<HighlightRow>("highlight").update({ page_id: id }, { module_id: moduleId });
  return toPage(row);
}

// A copy right after the original, starting over as not started. It gets
// its own cover and icon files, recordings and attachments, so deleting either page leaves the
// other whole. Downloaded page audio isn't copied; it can be made again.
export async function duplicatePage(id: number) {
  const original = await getPage(id);
  if (!original) throw new Error("This page no longer exists.");
  const copy = await createPage(original.module_id, {
    title: `${original.title} (copy)`,
    type: original.type,
    icon: await copyIcon(original.icon),
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

let lastDeletion = 0;

export function deletionTime() {
  lastDeletion = Math.max(Date.now(), lastDeletion + 1);
  return new Date(lastDeletion).toISOString().replace("T", " ").slice(0, 23);
}

export function deletePage(id: number) {
  return deletePages([id]);
}

export async function deletePages(ids: number[]) {
  if (ids.length === 0) return;
  await pageTable().update({ id: ids, deleted_at: null }, { deleted_at: deletionTime() });
}

export async function erasePages(filter: string, params: unknown[]) {
  const ofPages = `page_id IN (SELECT id FROM page WHERE ${filter})`;
  const pictures = await desktop.storage.query<{ cover: string | null; icon: string | null }>(`SELECT cover, icon FROM page WHERE ${filter}`, params);
  for (const { cover, icon } of pictures) {
    if (cover) await deleteImage(cover);
    await deleteIcon(icon);
  }
  await deleteRecordings(ofPages, params);
  await deleteAttachments(ofPages, params);
  await deletePageAudios(ofPages, params);
  await desktop.storage.execute(`DELETE FROM page WHERE ${filter}`, params);
}
