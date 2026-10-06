import { isFileReference } from "@/shared/lib/fileReference";
import { desktop } from "@chain/sdk";
import JSZip from "jszip";

import {
  getBackupRows,
  hasRecording,
  insertAttachmentRow,
  insertIfMissing,
  insertRecordingRow,
  setRestoredColumns,
  hasHomeWidgets,
  insertHomeWidgets
} from "./table";
import type { Backup } from "./types";

const BACKUP_JSON = "backup.json";
const FILES_FOLDER = "files/";

export async function createBackup(): Promise<Backup> {
  const [
    courses,
    modules,
    pages,
    attachments,
    recordings,
    widgets,
    layouts,
    pageTypes,
    flashcards,
    tasks,
    quizzes,
    quizQuestions,
    quizAttempts
  ] = await getBackupRows();
  const references = new Set([
    ...courses.flatMap((course) => [course.cover, course.icon]),
    ...modules.map((module) => module.icon),
    ...pages.flatMap((page) => [page.cover, page.icon, ...contentFiles(page.content ?? "")]),
    ...attachments.map((attachment) => attachment.file_path),
    ...recordings.map((recording) => recording.file_reference)
  ]);
  const files: Record<string, Uint8Array> = {};
  for (const reference of references) {
    if (!reference || !isFileReference(reference)) continue;
    const bytes = await desktop.files.read(reference).catch(() => null);
    if (bytes) files[reference] = bytes;
  }
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    courses,
    modules,
    pages,
    attachments,
    recordings,
    widgets,
    layouts,
    pageTypes,
    flashcards,
    tasks,
    quizzes,
    quizQuestions,
    quizAttempts,
    files
  };
}

function fileOfSrc(src: string) {
  if (!/^(asset:|https?:\/\/asset\.localhost\/)/.test(src)) return null;
  let name: string;
  try {
    name = decodeURIComponent(src).split(/[\\/]/).pop() ?? "";
  } catch {
    return null;
  }
  return isFileReference(name) ? name : null;
}

function contentFiles(html: string) {
  return [
    ...Array.from(html.matchAll(/src="([^"]+)"/g), ([, src]) => fileOfSrc(src)),
    ...Array.from(html.matchAll(/data-file="([^"]+)"/g), ([, reference]) => reference)
  ];
}

export async function backupArchive({ files = {}, ...rows }: Backup) {
  const zip = new JSZip();
  zip.file(BACKUP_JSON, JSON.stringify(rows, null, 2), { compression: "DEFLATE" });
  for (const [reference, bytes] of Object.entries(files)) zip.file(FILES_FOLDER + reference, bytes);
  return zip.generateAsync({ type: "uint8array" });
}
export async function saveBackup(backup: Backup): Promise<string | null> {
  const fileName = `mneme-backup-${backup.exportedAt.slice(0, 10)}.zip`;
  const archive = await backupArchive(backup);
  try {
    const saved = await desktop.files.save(archive, {
      suggestedName: fileName,
      extensions: ["zip"]
    });
    return saved?.name ?? null;
  } catch (error) {
    if ((error as { code?: string } | null)?.code !== "UNSUPPORTED") throw error;
    downloadBackup(fileName, archive);
    return fileName;
  }
}

function downloadBackup(fileName: string, archive: Uint8Array) {
  const blob = new Blob([new Uint8Array(archive)], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function readBackupFile(file: File): Promise<Backup> {
  let backup: Backup;
  try {
    backup = isZip(new Uint8Array(await file.slice(0, 4).arrayBuffer()))
      ? await readArchive(file)
      : JSON.parse(await file.text());
  } catch {
    throw new Error("This file isn't a valid Mneme backup.");
  }
  if ((backup?.version !== 1 && backup?.version !== 2) || !Array.isArray(backup.courses)) {
    throw new Error("This file isn't a valid Mneme backup.");
  }
  return backup;
}

function isZip(header: Uint8Array) {
  return header[0] === 0x50 && header[1] === 0x4b && header[2] === 0x03 && header[3] === 0x04;
}

async function readArchive(file: File): Promise<Backup> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const json = zip.file(BACKUP_JSON);
  if (!json) throw new Error("No backup.json in this archive.");
  const backup: Backup = JSON.parse(await json.async("string"));
  backup.files = {};
  for (const entry of zip.file(new RegExp(`^${FILES_FOLDER}`))) {
    backup.files[entry.name.slice(FILES_FOLDER.length)] = await entry.async("uint8array");
  }
  return backup;
}
const legacyStatus: Record<string, number> = {
  not_started: 1,
  in_progress: 2,
  completed: 3,
  revision_needed: 4
};
const legacyPageType: Record<string, number> = {
  lesson: 1,
  lecture: 2,
  exercise: 3,
  discussion: 4,
  assignment: 5,
  notes: 6,
  reading: 7,
  revision: 8,
  custom: 9
};

function normalize(value: unknown, legacy: Record<string, number>, fallback: number): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return legacy[value] ?? fallback;
  return fallback;
}

export async function restoreBackup(backup: Backup) {
  const files = new RestoredFiles(backup.files ?? {});
  for (const course of backup.courses) {
    const inserted = await insertIfMissing("course", {
      id: course.id,
      name: course.name,
      description: course.description,
      icon: course.icon,
      color: course.color,
      status: normalize(course.status, legacyStatus, 1),
      progress: course.progress ?? 0,
      bookmarked: course.bookmarked ?? 0,
      position: course.position ?? 0,
      code: course.code ?? null,
      semester: course.semester ?? null,
      school: course.school ?? null,
      instructor: course.instructor ?? null,
      created_at: course.created_at,
      updated_at: course.updated_at
    });
    if (!inserted) continue;
    await setRestoredColumns("course", course.id, {
      icon: await files.column(course.icon),
      cover: await files.column(course.cover ?? null)
    });
  }
  for (const module of backup.modules) {
    const inserted = await insertIfMissing("module", {
      id: module.id,
      course_id: module.course_id,
      name: module.name,
      description: module.description,
      status: normalize(module.status, legacyStatus, 1),
      progress: module.progress ?? 0,
      bookmarked: module.bookmarked ?? 0,
      icon: module.icon ?? null,
      position: module.position ?? 0,
      created_at: module.created_at,
      updated_at: module.updated_at
    });
    if (inserted)
      await setRestoredColumns("module", module.id, {
        icon: await files.column(module.icon ?? null)
      });
  }
  for (const pageType of backup.pageTypes ?? []) {
    await insertIfMissing("custom_page_type", {
      id: pageType.id,
      name: pageType.name,
      position: pageType.position ?? 0,
      created_at: pageType.created_at,
      updated_at: pageType.updated_at
    });
  }
  for (const page of backup.pages) {
    const inserted = await insertIfMissing("page", {
      id: page.id,
      module_id: page.module_id,
      title: page.title,
      type: normalize(page.type, legacyPageType, 1),
      content: page.content,
      status: normalize(page.status, legacyStatus, 1),
      progress: page.progress ?? 0,
      bookmarked: page.bookmarked ?? 0,
      icon: page.icon ?? null,
      position: page.position ?? 0,
      created_at: page.created_at,
      updated_at: page.updated_at
    });
    if (!inserted) continue;
    await setRestoredColumns("page", page.id, {
      icon: await files.column(page.icon ?? null),
      cover: await files.column(page.cover ?? null),
      content: page.content ? await restoredContent(page.content, page.id, backup, files) : null
    });
  }
  for (const card of backup.flashcards ?? []) {
    await insertIfMissing("flashcard", {
      id: card.id,
      module_id: card.module_id,
      page_id: card.page_id,
      front: card.front,
      back: card.back,
      ease: card.ease,
      interval_days: card.interval_days,
      repetitions: card.repetitions,
      due_at: card.due_at,
      right_count: card.right_count,
      wrong_count: card.wrong_count,
      last_reviewed_at: card.last_reviewed_at,
      created_at: card.created_at,
      updated_at: card.updated_at
    });
  }
  for (const task of backup.tasks ?? []) {
    await insertIfMissing("task", {
      id: task.id,
      title: task.title,
      type: task.type,
      course_id: task.course_id,
      module_id: task.module_id,
      page_id: task.page_id,
      due_on: task.due_on,
      completed_at: task.completed_at,
      created_at: task.created_at,
      updated_at: task.updated_at
    });
  }
  for (const quiz of backup.quizzes ?? [])
    await insertIfMissing("quiz", {
      id: quiz.id,
      module_id: quiz.module_id,
      page_id: quiz.page_id,
      title: quiz.title,
      created_at: quiz.created_at,
      updated_at: quiz.updated_at
    });
  for (const question of backup.quizQuestions ?? [])
    await insertIfMissing("quiz_question", {
      id: question.id,
      quiz_id: question.quiz_id,
      position: question.position,
      kind: question.kind,
      prompt: question.prompt,
      choices: question.choices,
      answer: question.answer,
      explanation: question.explanation,
      page_id: question.page_id
    });
  for (const attempt of backup.quizAttempts ?? [])
    await insertIfMissing("quiz_attempt", {
      id: attempt.id,
      quiz_id: attempt.quiz_id,
      score: attempt.score,
      total: attempt.total,
      answers: attempt.answers,
      created_at: attempt.created_at
    });
  for (const layout of backup.layouts ?? []) {
    await insertIfMissing("home_layout", {
      name: layout.name,
      widgets: layout.widgets,
      created_at: layout.created_at,
      updated_at: layout.updated_at
    });
  }
  for (const recording of backup.recordings ?? []) {
    if (recording.page_id !== null || !files.has(recording.file_reference)) continue;
    if (await hasRecording(recording.name, recording.created_at)) continue;
    await insertRecordingRow({
      page_id: null,
      name: recording.name,
      file_reference: await files.restore(recording.file_reference),
      mime_type: recording.mime_type,
      duration_ms: recording.duration_ms,
      transcript: recording.transcript,
      segments: recording.segments,
      created_at: recording.created_at
    });
  }
  if (backup.widgets?.length && !(await hasHomeWidgets())) await insertHomeWidgets(backup.widgets);
}

class RestoredFiles {
  private readonly written = new Map<string, Promise<string>>();

  constructor(private readonly files: Record<string, Uint8Array>) {}

  has(reference: string) {
    return reference in this.files;
  }

  restore(reference: string) {
    let written = this.written.get(reference);
    if (!written) {
      const extension = /\.([a-z0-9]+)$/i.exec(reference)?.[1];
      written = desktop.files.write(this.files[reference], extension ? { extension } : undefined);
      this.written.set(reference, written);
    }
    return written;
  }

  async column(value: string | null) {
    if (!value || !isFileReference(value)) return value;
    return this.has(value) ? this.restore(value) : null;
  }
}

async function restoredContent(html: string, pageId: number, backup: Backup, files: RestoredFiles) {
  let content = await replaceEach(html, /src="([^"]+)"/g, async (src) => {
    const reference = fileOfSrc(src);
    return reference && files.has(reference)
      ? desktop.files.url(await files.restore(reference))
      : null;
  });
  content = await replaceEach(content, /data-file="([^"]+)"/g, async (reference) =>
    files.has(reference) ? files.restore(reference) : null
  );
  content = await replaceEach(content, /data-attachment-id="(\d+)"/g, async (id) => {
    const attachment = backup.attachments?.find((row) => String(row.id) === id);
    if (!attachment || !files.has(attachment.file_path)) return null;
    return String(
      await insertAttachmentRow({
        page_id: pageId,
        file_name: attachment.file_name,
        file_path: await files.restore(attachment.file_path),
        mime_type: attachment.mime_type,
        size_bytes: attachment.size_bytes
      })
    );
  });
  return replaceEach(content, /data-recording-id="(\d+)"/g, async (id) => {
    const recording = backup.recordings?.find((row) => String(row.id) === id);
    if (!recording || !files.has(recording.file_reference)) return null;
    return String(
      await insertRecordingRow({
        page_id: pageId,
        name: recording.name,
        file_reference: await files.restore(recording.file_reference),
        mime_type: recording.mime_type,
        duration_ms: recording.duration_ms,
        transcript: recording.transcript,
        segments: recording.segments
      })
    );
  });
}

async function replaceEach(
  text: string,
  pattern: RegExp,
  replacement: (value: string) => Promise<string | null>
) {
  const replaced = new Map<string, string | null>();
  for (const [, value] of text.matchAll(pattern)) {
    if (!replaced.has(value)) replaced.set(value, await replacement(value));
  }
  return text.replace(pattern, (match, value: string) => {
    const next = replaced.get(value);
    return next ? match.replace(value, next) : match;
  });
}
