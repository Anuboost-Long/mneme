import { compactHtml } from "@/features/ai-actions/lib/context";
import { escapeHtml } from "@/features/ai-actions/lib/editorHtml";
import { preferenceLines, type AiProfile } from "@/features/ai-profiles/lib/profile/types";
import { getPageAttachments, readAttachmentText } from "@/features/courses/lib/attachment/actions";
import { completionStatusLabels } from "@/features/courses/lib/completion-status";
import { getCourse } from "@/features/courses/lib/course/actions";
import type { Course } from "@/features/courses/lib/course/types";
import { getModule } from "@/features/courses/lib/module/actions";
import type { Module } from "@/features/courses/lib/module/types";
import { getPage, getPages } from "@/features/courses/lib/page/actions";
import { pageTypeLabels, type Page } from "@/features/courses/lib/page/types";
import { getPageRecordings } from "@/features/courses/lib/recording/actions";
import type { ImageData } from "@/shared/lib/htmlImages";
import { extractTextFromBytes } from "@/shared/lib/ocr";

import type { AiContext, ContextLayer } from "./types";

export const CONTEXT_BUDGET_CHARS = 60_000;
const MAX_LISTED_PAGES = 60;
const MIN_KEPT_CHARS = 200;

enum TrimOrder {
  Transcript = 1,
  AttachmentText = 2,
  ImageText = 3,
  PageText = 4,
  Selection = 5
}

type Part = {
  label: string;
  detail: string;
  tag: string;
  attributes?: Record<string, string | number | null | undefined>;
  body: string;
  trimOrder?: TrimOrder;
  trimmed?: boolean;
};

export type ActionSubject = "selection" | "image" | "page" | "module" | "course";

function render({ tag, attributes = {}, body }: Part) {
  const attributeText = Object.entries(attributes)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([name, value]) => ` ${name}="${escapeHtml(String(value))}"`)
    .join("");
  return body ? `<${tag}${attributeText}>\n${body}\n</${tag}>` : `<${tag}${attributeText} />`;
}

function words(text: string) {
  const count = text.trim().split(/\s+/).filter(Boolean).length;
  return `${count.toLocaleString()} ${count === 1 ? "word" : "words"}`;
}

function plainText(html: string) {
  return new DOMParser().parseFromString(html, "text/html").body.textContent ?? "";
}

function withPictureMarkers(html: string) {
  const document = new DOMParser().parseFromString(html, "text/html");
  for (const image of Array.from(document.querySelectorAll("img"))) {
    const alt = image.getAttribute("alt")?.trim();
    image.replaceWith(document.createTextNode(alt ? `[Picture: ${alt}]` : "[Picture]"));
  }
  return document.body.innerHTML;
}

function normalized(text: string) {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function fitBudget(parts: Part[]) {
  let over = parts.reduce((total, part) => total + render(part).length, 0) - CONTEXT_BUDGET_CHARS;
  const trimmable = parts
    .filter((part) => part.trimOrder !== undefined && part.body)
    .sort((first, second) => (first.trimOrder ?? 0) - (second.trimOrder ?? 0));
  for (const part of trimmable) {
    if (over <= 0) break;
    const kept = part.body.length - over;
    over -= part.body.length;
    part.trimmed = true;
    if (kept < MIN_KEPT_CHARS) {
      part.body = "";
      part.detail = `${part.detail}, left out to fit`;
      continue;
    }
    part.body = `${part.body.slice(0, kept)}\n[… cut to fit]`;
    over += part.body.length;
    part.detail = `${part.detail}, cut to fit`;
  }
}

function layers(parts: Part[], profile: AiProfile | null): ContextLayer[] {
  const result: ContextLayer[] = [];
  const lines = profile ? preferenceLines(profile) : [];
  if (profile && lines.length)
    result.push({ label: "AI profile", detail: profile.name, chars: lines.join("\n").length });
  for (const part of parts) {
    const chars = part.trimmed && !part.body ? 0 : render(part).length;
    const existing = result.find((layer) => layer.label === part.label);
    if (existing) {
      existing.detail = `${existing.detail}; ${part.detail}`;
      existing.chars += chars;
      existing.trimmed ||= part.trimmed;
    } else result.push({ label: part.label, detail: part.detail, chars, trimmed: part.trimmed });
  }
  return result;
}

function coursePart(course: Course, withIds: boolean): Part {
  const facts = [course.code, course.semester, course.school, course.instructor].filter(Boolean);
  return {
    label: "Course",
    detail: [course.name, ...facts].join(" · "),
    tag: "course",
    attributes: {
      id: withIds ? course.id : null,
      name: course.name,
      code: course.code,
      semester: course.semester,
      school: course.school,
      instructor: course.instructor
    },
    body: course.description ?? ""
  };
}

async function modulePart(
  module: Module,
  currentPageId: number | null,
  withIds: boolean
): Promise<Part> {
  const pages = await getPages(module.id);
  const listed = pages.slice(0, MAX_LISTED_PAGES).map((page) => {
    const id = withIds ? `id ${page.id}, ` : "";
    const current = page.id === currentPageId ? ", the open page" : "";
    return `- ${page.title} (${id}${pageTypeLabels[page.type]}, ${completionStatusLabels[page.status]}${current})`;
  });
  if (pages.length > MAX_LISTED_PAGES)
    listed.push(`- … and ${pages.length - MAX_LISTED_PAGES} more`);
  const pageList = listed.length ? `Pages in this module, in order:\n${listed.join("\n")}` : "";
  return {
    label: "Module",
    detail: `${module.name}, ${pages.length} ${pages.length === 1 ? "page" : "pages"} listed`,
    tag: "module",
    attributes: { id: withIds ? module.id : null, name: module.name },
    body: [module.description, pageList].filter(Boolean).join("\n\n")
  };
}

function pagePart(page: Page, body: string, withIds: boolean): Part {
  return {
    label: "Page",
    detail: body ? `${page.title}, ${words(plainText(body))}` : `${page.title}, details only`,
    tag: "page",
    attributes: {
      id: withIds ? page.id : null,
      title: page.title,
      type: pageTypeLabels[page.type],
      status: completionStatusLabels[page.status]
    },
    body,
    trimOrder: body ? TrimOrder.PageText : undefined
  };
}

function selectionPart(text: string): Part {
  return {
    label: "Selection",
    detail: words(text),
    tag: "selection",
    body: text.trim(),
    trimOrder: TrimOrder.Selection
  };
}

async function attachmentParts(pageId: number, withText: boolean): Promise<Part[]> {
  const parts: Part[] = [];
  for (const attachment of await getPageAttachments(pageId)) {
    const text = withText ? await readAttachmentText(attachment) : null;
    parts.push({
      label: "Attachments",
      detail: text
        ? `${attachment.file_name}, ${words(text)}`
        : `${attachment.file_name}, name only`,
      tag: "attachment",
      attributes: {
        name: attachment.file_name,
        type: attachment.mime_type,
        size:
          attachment.size_bytes === null
            ? null
            : `${Math.max(1, Math.round(attachment.size_bytes / 1024))} KB`
      },
      body: text?.trim() ?? "",
      trimOrder: TrimOrder.AttachmentText
    });
  }
  return parts;
}

const recognizedText = new Map<string, string>();

function fingerprint(bytes: Uint8Array) {
  let hash = 2166136261;
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 16777619);
  return `${bytes.length}:${hash >>> 0}`;
}

async function imageText(bytes: Uint8Array) {
  const key = fingerprint(bytes);
  const known = recognizedText.get(key);
  if (known !== undefined) return known;
  const text = await extractTextFromBytes(bytes).then(
    (result) => result.text.trim(),
    () => ""
  );
  recognizedText.set(key, text);
  return text;
}

async function imageTextParts(images: ImageData[]): Promise<Part[]> {
  const parts: Part[] = [];
  for (const [index, image] of images.entries()) {
    const text = await imageText(image.bytes);
    if (!text) continue;
    parts.push({
      label: "Image text",
      detail: `Image ${index + 1}, ${words(text)}`,
      tag: "image-text",
      attributes: { image: index + 1 },
      body: text,
      trimOrder: TrimOrder.ImageText
    });
  }
  return parts;
}

async function transcriptParts(
  pageId: number,
  pageText: string,
  withText: boolean
): Promise<Part[]> {
  const inPage = normalized(pageText);
  const parts: Part[] = [];
  for (const recording of await getPageRecordings(pageId)) {
    const transcript = recording.transcript?.trim() ?? "";
    if (transcript && inPage.includes(normalized(transcript).slice(0, 300))) continue;
    const minutes = Math.max(1, Math.round(recording.duration_ms / 60_000));
    const sendText = withText && transcript !== "";
    let detail = `${recording.name}, no transcript yet`;
    if (sendText) detail = `${recording.name}, ${words(transcript)}`;
    else if (transcript) detail = `${recording.name}, name only`;
    parts.push({
      label: "Transcripts",
      detail,
      tag: "recording",
      attributes: {
        id: withText ? null : recording.id,
        name: recording.name,
        length: `${minutes} min`,
        transcript: transcript ? null : "none"
      },
      body: sendText ? transcript : "",
      trimOrder: TrimOrder.Transcript
    });
  }
  return parts;
}

async function locate(pageId: number) {
  const page = await getPage(pageId);
  const module = page ? await getModule(page.module_id) : undefined;
  const course = module ? await getCourse(module.course_id) : undefined;
  return { page, module, course };
}

// Background for an AI action, as a <context> block sent ahead of its
// subject. `images` are the subject's pictures; they're read with OCR
// only when the agent can't receive them itself.
export async function buildActionContext(
  location: { pageId: number; moduleId: number; courseId: number },
  subject: ActionSubject,
  images: ImageData[],
  readsImages: boolean,
  profile: AiProfile | null
): Promise<AiContext> {
  const parts: Part[] = [];
  const course = await getCourse(location.courseId);
  if (course) parts.push(coursePart(course, false));
  if (subject === "course") return finish(parts, profile, "");

  const module = await getModule(location.moduleId);
  if (module)
    parts.push(await modulePart(module, subject === "module" ? null : location.pageId, false));
  if (subject === "module") return finish(parts, profile, "");

  const page = await getPage(location.pageId);
  if (page) {
    parts.push(
      pagePart(page, "", false),
      ...(await attachmentParts(page.id, true)),
      ...(readsImages ? [] : await imageTextParts(images)),
      ...(await transcriptParts(page.id, plainText(page.content ?? ""), true))
    );
  }
  return finish(parts, profile, "");
}

const chatLead =
  'Where the user is in mneme right now, as background for their message (not the request itself). When they say "this page", "my selection" or "this module", they mean these.';

// Sent ahead of each chat message from a page. Agents with mneme's tools
// get names and ids to read from; the others get the content itself.
// Pictures stay markers here: loading and reading them takes seconds,
// too long to hold up every message.
export async function buildChatContext(
  pageId: number | null,
  selection: string,
  hasTools: boolean,
  profile: AiProfile | null
): Promise<AiContext> {
  if (pageId === null) return finish([], profile, "");
  const { page, module, course } = await locate(pageId);
  if (!page) return finish([], profile, "");
  const parts: Part[] = [];
  if (course) parts.push(coursePart(course, hasTools));
  if (module) parts.push(await modulePart(module, page.id, hasTools));

  const content = page.content ?? "";
  if (hasTools) {
    parts.push(pagePart(page, "", true));
  } else {
    parts.push(pagePart(page, withPictureMarkers(compactHtml(content)), false));
  }
  parts.push(
    ...(selection.trim() ? [selectionPart(selection)] : []),
    ...(await attachmentParts(page.id, !hasTools)),
    ...(await transcriptParts(page.id, plainText(content), !hasTools))
  );

  const readMore = hasTools
    ? " Read the page with get_page, its pictures with get_page_images and a recording's transcript with read_transcript, using the ids below."
    : "";
  return finish(parts, profile, `${chatLead}${readMore}`);
}

function finish(parts: Part[], profile: AiProfile | null, lead: string): AiContext {
  fitBudget(parts);
  const kept = parts.filter((part) => part.body || !part.trimmed);
  const body = kept.map(render).join("\n");
  const block = body ? `<context>\n${body}\n</context>` : "";
  const text = block && lead ? `${lead}\n\n${block}` : block;
  return { text, layers: layers(parts, profile) };
}
