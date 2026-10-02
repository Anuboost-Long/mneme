import { desktop } from "@chain/sdk";
import JSZip from "jszip";
import { isFileReference } from "../../../shared/lib/fileReference";
import type { AttachmentRow } from "../../../shared/lib/db/schema/attachment";
import type { CourseRow } from "../../../shared/lib/db/schema/course";
import type { ModuleRow } from "../../../shared/lib/db/schema/module";
import type { PageRow } from "../../../shared/lib/db/schema/page";
import type { RecordingRow } from "../../../shared/lib/db/schema/recording";

// Version 1 is a plain JSON file of courses, modules and pages. Version 2 is
// a zip: the rows as backup.json, plus every file they refer to (covers,
// picture icons, images and videos in pages, attachments, recordings)
// under files/.
export type Backup = {
  version: 1 | 2;
  exportedAt: string;
  courses: CourseRow[];
  modules: ModuleRow[];
  pages: PageRow[];
  attachments?: AttachmentRow[];
  recordings?: RecordingRow[];
  files?: Record<string, Uint8Array>;
};

const BACKUP_JSON = "backup.json";
const FILES_FOLDER = "files/";
const LIVE_PAGE_IDS = "SELECT id FROM page WHERE deleted_at IS NULL";

export async function createBackup(): Promise<Backup> {
  const [courses, modules, pages, attachments, recordings] = await Promise.all([
    desktop.storage.query<CourseRow>("SELECT * FROM course WHERE deleted_at IS NULL ORDER BY id"),
    desktop.storage.query<ModuleRow>("SELECT * FROM module WHERE deleted_at IS NULL ORDER BY id"),
    desktop.storage.query<PageRow>("SELECT * FROM page WHERE deleted_at IS NULL ORDER BY id"),
    desktop.storage.query<AttachmentRow>(`SELECT * FROM attachment WHERE page_id IN (${LIVE_PAGE_IDS}) ORDER BY id`),
    desktop.storage.query<RecordingRow>(`SELECT * FROM recording WHERE page_id IN (${LIVE_PAGE_IDS}) ORDER BY id`),
  ]);
  const references = new Set([
    ...courses.flatMap((course) => [course.cover, course.icon]),
    ...modules.map((module) => module.icon),
    ...pages.flatMap((page) => [page.cover, page.icon, ...contentFiles(page.content ?? "")]),
    ...attachments.map((attachment) => attachment.file_path),
    ...recordings.map((recording) => recording.file_reference),
  ]);
  const files: Record<string, Uint8Array> = {};
  for (const reference of references) {
    if (!reference || !isFileReference(reference)) continue;
    const bytes = await desktop.files.read(reference).catch(() => null);
    if (bytes) files[reference] = bytes;
  }
  return { version: 2, exportedAt: new Date().toISOString(), courses, modules, pages, attachments, recordings, files };
}

// The file behind an image's src, when it's one of the app's own files.
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
    ...Array.from(html.matchAll(/data-file="([^"]+)"/g), ([, reference]) => reference),
  ];
}

export async function backupArchive({ files = {}, ...rows }: Backup) {
  const zip = new JSZip();
  zip.file(BACKUP_JSON, JSON.stringify(rows, null, 2), { compression: "DEFLATE" });
  for (const [reference, bytes] of Object.entries(files)) zip.file(FILES_FOLDER + reference, bytes);
  return zip.generateAsync({ type: "uint8array" });
}

// Asks where to save, every time — the native save sheet never reuses a
// remembered location. Resolves the saved file's name, or null if the user
// cancelled. Outside the desktop runtime (UNSUPPORTED) it falls back to a
// plain browser download.
export async function saveBackup(backup: Backup): Promise<string | null> {
  const fileName = `mneme-backup-${backup.exportedAt.slice(0, 10)}.zip`;
  const archive = await backupArchive(backup);
  try {
    const saved = await desktop.files.save(archive, { suggestedName: fileName, extensions: ["zip"] });
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
  // The webview's download handling can read the blob: URL asynchronously,
  // after this function returns — an unattached link and an immediate
  // revoke both race that and can silently drop the download.
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export async function readBackupFile(file: File): Promise<Backup> {
  let backup: Backup;
  try {
    backup = isZip(new Uint8Array(await file.slice(0, 4).arrayBuffer())) ? await readArchive(file) : JSON.parse(await file.text());
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

// A backup taken before 0002/0003 shipped has no status/progress/bookmarked
// at all, and module.status/page.type as the old TEXT values ('not_started',
// 'lesson', ...) instead of numbers. Normalize both cases so a restore never
// violates a NOT NULL constraint or plants a stray string in a numeric column.
const legacyStatus: Record<string, number> = { not_started: 1, in_progress: 2, completed: 3, revision_needed: 4 };
const legacyPageType: Record<string, number> = {
  lesson: 1, lecture: 2, exercise: 3, discussion: 4, assignment: 5, notes: 6, reading: 7, revision: 8, custom: 9,
};

function normalize(value: unknown, legacy: Record<string, number>, fallback: number): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return legacy[value] ?? fallback;
  return fallback;
}

export async function restoreBackup(backup: Backup) {
  const files = new RestoredFiles(backup.files ?? {});
  for (const course of backup.courses) {
    const { rowsAffected } = await desktop.storage.execute(
      `INSERT OR IGNORE INTO course
        (id, name, description, icon, color, status, progress, bookmarked, position, code, semester, school, instructor, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        course.id, course.name, course.description, course.icon, course.color,
        normalize(course.status, legacyStatus, 1), course.progress ?? 0, course.bookmarked ?? 0,
        course.position ?? 0, course.code ?? null, course.semester ?? null, course.school ?? null, course.instructor ?? null,
        course.created_at, course.updated_at,
      ],
    );
    if (rowsAffected === 0) continue;
    await desktop.storage.execute("UPDATE course SET icon = ?, cover = ? WHERE id = ?", [
      await files.column(course.icon), await files.column(course.cover ?? null), course.id,
    ]);
  }
  for (const module of backup.modules) {
    const { rowsAffected } = await desktop.storage.execute(
      `INSERT OR IGNORE INTO module
        (id, course_id, name, description, status, progress, bookmarked, icon, position, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        module.id, module.course_id, module.name, module.description,
        normalize(module.status, legacyStatus, 1), module.progress ?? 0, module.bookmarked ?? 0,
        module.icon ?? null, module.position ?? 0,
        module.created_at, module.updated_at,
      ],
    );
    if (rowsAffected > 0) {
      await desktop.storage.execute("UPDATE module SET icon = ? WHERE id = ?", [await files.column(module.icon ?? null), module.id]);
    }
  }
  for (const page of backup.pages) {
    const { rowsAffected } = await desktop.storage.execute(
      `INSERT OR IGNORE INTO page
        (id, module_id, title, type, content, status, progress, bookmarked, icon, position, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        page.id, page.module_id, page.title, normalize(page.type, legacyPageType, 1), page.content,
        normalize(page.status, legacyStatus, 1), page.progress ?? 0, page.bookmarked ?? 0,
        page.icon ?? null, page.position ?? 0,
        page.created_at, page.updated_at,
      ],
    );
    if (rowsAffected === 0) continue;
    await desktop.storage.execute("UPDATE page SET icon = ?, cover = ?, content = ? WHERE id = ?", [
      await files.column(page.icon ?? null),
      await files.column(page.cover ?? null),
      page.content ? await restoredContent(page.content, page.id, backup, files) : null,
      page.id,
    ]);
  }
}

// Writes each backed-up file once, under a new reference.
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

  // A cover or icon column: a backed-up file gets its new reference, one
  // missing from the backup is dropped, and anything else (a preset, an
  // emoji) stays as it is.
  async column(value: string | null) {
    if (!value || !isFileReference(value)) return value;
    return this.has(value) ? this.restore(value) : null;
  }
}

// Points the page's images and videos at their restored files, and
// recreates its attachments and recordings under new ids. Anything not in
// the backup is left as it was.
async function restoredContent(html: string, pageId: number, backup: Backup, files: RestoredFiles) {
  let content = await replaceEach(html, /src="([^"]+)"/g, async (src) => {
    const reference = fileOfSrc(src);
    return reference && files.has(reference) ? desktop.files.url(await files.restore(reference)) : null;
  });
  content = await replaceEach(content, /data-file="([^"]+)"/g, async (reference) =>
    files.has(reference) ? files.restore(reference) : null
  );
  content = await replaceEach(content, /data-attachment-id="(\d+)"/g, async (id) => {
    const attachment = backup.attachments?.find((row) => String(row.id) === id);
    if (!attachment || !files.has(attachment.file_path)) return null;
    const { lastInsertId } = await desktop.storage.execute(
      "INSERT INTO attachment (page_id, file_name, file_path, mime_type, size_bytes) VALUES (?, ?, ?, ?, ?)",
      [pageId, attachment.file_name, await files.restore(attachment.file_path), attachment.mime_type, attachment.size_bytes]
    );
    return String(lastInsertId);
  });
  return replaceEach(content, /data-recording-id="(\d+)"/g, async (id) => {
    const recording = backup.recordings?.find((row) => String(row.id) === id);
    if (!recording || !files.has(recording.file_reference)) return null;
    const { lastInsertId } = await desktop.storage.execute(
      "INSERT INTO recording (page_id, name, file_reference, mime_type, duration_ms, transcript, segments) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [pageId, recording.name, await files.restore(recording.file_reference), recording.mime_type, recording.duration_ms, recording.transcript, recording.segments]
    );
    return String(lastInsertId);
  });
}

// Replaces each match's captured value with what `replacement` returns for
// it (once per distinct value), all in one pass, so a new value can't be
// mistaken for an old one still waiting to be replaced. Null keeps it.
async function replaceEach(text: string, pattern: RegExp, replacement: (value: string) => Promise<string | null>) {
  const replaced = new Map<string, string | null>();
  for (const [, value] of text.matchAll(pattern)) {
    if (!replaced.has(value)) replaced.set(value, await replacement(value));
  }
  return text.replace(pattern, (match, value: string) => {
    const next = replaced.get(value);
    return next ? match.replace(value, next) : match;
  });
}
