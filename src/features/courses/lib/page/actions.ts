import { sql, type SqlFragment, type Values } from "@chain/sdk";

import type { PageRow } from "../../../../shared/lib/db/schema/page";
import { recordStudy } from "../../../../shared/lib/study-day/actions";
import { deletePageAudios } from "../../../audiobook/lib/page-audio/actions";
import { copyAttachments, deleteAttachments } from "../attachment/actions";
import { CompletionStatus } from "../completion-status";
import { reconcileHighlights, syncPageHighlights } from "../highlight/actions";
import { copyIcon, deleteIcon, deleteReplacedIcon, storeIcon } from "../icon/actions";
import { copyImage, deleteImage, storeInlineImages } from "../page-image";
import { copyRecordings, deleteRecording, deleteRecordings } from "../recording/actions";
import {
  deletePageRows,
  getPage,
  getPagesMatching,
  getPages,
  getPagesWithInlineImages,
  insertPage,
  movePageToModule,
  replacePageContent,
  savePagePositions,
  setPageOpened,
  softDeletePages,
  updatePageColumns
} from "./table";
import { PageType, type PageInput } from "./types";

export {
  getCoursePageProgress,
  getModulePageProgress,
  getPage,
  getPages,
  searchPageLinks,
  searchPages
} from "./table";

function pageTitle(title: string) {
  if (!title.trim()) throw new Error("Enter a page title.");
  return title.trim();
}

function clampProgress(progress: number) {
  return Math.min(100, Math.max(0, Math.round(progress)));
}

async function syncHighlightsSafely(pageId: number, moduleId: number, content: string | null) {
  try {
    await syncPageHighlights(pageId, moduleId, content);
  } catch (error) {
    console.error("Couldn't sync highlights for page", pageId, error);
  }
}

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

export async function storeInlinePageImages() {
  for (const { id, content } of await getPagesWithInlineImages()) {
    if (!content) continue;
    const stored = await storeInlineImages(content);
    if (stored !== content) await replacePageContent(id, content, stored);
  }
}

export async function createPage(moduleId: number, input: PageInput) {
  const page = await insertPage({
    module_id: moduleId,
    title: pageTitle(input.title),
    type: input.type ?? PageType.Lesson,
    content: await pageContent(input.content),
    status: input.status ?? CompletionStatus.NotStarted,
    progress: clampProgress(input.progress ?? 0),
    bookmarked: input.bookmarked ? 1 : 0,
    icon: await storeIcon(input.icon),
    cover: input.cover ?? null
  });
  if (!page) throw new Error("The saved page could not be found.");
  if (page.content) await syncHighlightsSafely(page.id, moduleId, page.content);
  return page;
}

export async function updatePage(
  id: number,
  input: Partial<PageInput>,
  options: { skipHighlightReconciliation?: boolean } = {}
) {
  const previous =
    input.icon !== undefined ||
    input.cover !== undefined ||
    input.status !== undefined ||
    input.content !== undefined
      ? await getPage(id)
      : undefined;
  let content: string | null | undefined;
  if (input.content !== undefined) {
    const trimmed = await pageContent(input.content);
    content = options.skipHighlightReconciliation
      ? trimmed
      : reconcileHighlightsSafely(previous?.content ?? null, trimmed);
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
  const page = await updatePageColumns(id, changes);
  if (!page) throw new Error("This page no longer exists.");
  if (
    input.status === CompletionStatus.Completed &&
    previous?.status !== CompletionStatus.Completed
  )
    await recordStudy("completed");
  if (previous?.cover && input.cover !== undefined && previous.cover !== input.cover)
    await deleteImage(previous.cover);
  if (input.icon !== undefined) await deleteReplacedIcon(previous?.icon, page.icon);
  if (content !== undefined) await syncHighlightsSafely(page.id, page.module_id, page.content);
  return page;
}

export async function appendToPage(id: number, html: string) {
  const page = await getPage(id);
  if (!page) throw new Error("This page no longer exists.");
  return updatePage(id, { content: `${page.content ?? ""}${html}` });
}

export async function insertBlocks(id: number, html: string, where: { after?: string; at?: "start" | "end" } = {}) {
  const page = await getPage(id);
  if (!page) throw new Error("This page no longer exists.");
  const doc = new DOMParser().parseFromString(`<!doctype html><html><body>${page.content ?? ""}</body></html>`, "text/html");
  const holder = doc.createElement("div");
  holder.innerHTML = html;
  if (!holder.textContent?.trim() && !holder.querySelector("img, video, table, hr")) throw new Error("There’s nothing to insert.");
  const blocks = Array.from(holder.childNodes);
  const needle = where.after?.trim().toLowerCase();
  if (needle) {
    const anchor = Array.from(doc.body.children).find((block) => block.textContent?.toLowerCase().includes(needle));
    if (!anchor) throw new Error(`No block on this page contains “${where.after}”.`);
    anchor.after(...blocks);
  } else if (where.at === "start") doc.body.prepend(...blocks);
  else doc.body.append(...blocks);
  return updatePage(id, { content: doc.body.innerHTML });
}

export async function deleteRecordingFromPage(recordingId: number, pageId: number) {
  await deleteRecording(recordingId);
  const page = await getPage(pageId);
  const content = page?.content?.replace(
    new RegExp(`<div data-recording-id="${recordingId}"[^>]*></div>`, "g"),
    ""
  );
  if (page && content !== page.content) await updatePage(pageId, { content: content ?? null });
}

export async function markPageOpened(id: number) {
  await setPageOpened(id);
  await recordStudy("opened");
}

export async function reorderPages(ids: number[]) {
  await savePagePositions(ids);
}

export async function movePage(id: number, moduleId: number) {
  const page = await movePageToModule(id, moduleId);
  if (!page) throw new Error("This page no longer exists.");
  return page;
}

export async function createPageAfter(id: number, input: PageInput) {
  const original = await getPage(id);
  if (!original) throw new Error("This page no longer exists.");
  const page = await createPage(original.module_id, input);
  const ordered = (await getPages(original.module_id)).filter((item) => item.id !== page.id);
  ordered.splice(ordered.findIndex((item) => item.id === original.id) + 1, 0, page);
  await reorderPages(ordered.map((item) => item.id));
  return page;
}

export async function duplicatePage(id: number) {
  const original = await getPage(id);
  if (!original) throw new Error("This page no longer exists.");
  const copy = await createPageAfter(id, {
    title: `${original.title} (copy)`,
    type: original.type,
    icon: await copyIcon(original.icon),
    cover: original.cover ? await copyImage(original.cover) : null
  });
  const content = original.content
    ? await copyAttachments(await copyRecordings(original.content, copy.id), copy.id)
    : null;
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
  await softDeletePages(ids, deletionTime());
}

export function erasePage(id: number) {
  return erasePages(sql`id = ${id}`);
}

export async function erasePages(filter: SqlFragment) {
  const ofPages = sql`page_id IN (SELECT id FROM page WHERE ${filter})`;
  for (const { cover, icon } of await getPagesMatching(filter)) {
    if (cover) await deleteImage(cover);
    await deleteIcon(icon);
  }
  await deleteRecordings(ofPages);
  await deleteAttachments(ofPages);
  await deletePageAudios(ofPages);
  await deletePageRows(filter);
}
