import { desktop } from "@chain/sdk";
import type { CourseRow } from "../../../shared/lib/db/schema/course";
import type { ModuleRow } from "../../../shared/lib/db/schema/module";
import type { PageRow } from "../../../shared/lib/db/schema/page";

export type Backup = {
  version: 1;
  exportedAt: string;
  courses: CourseRow[];
  modules: ModuleRow[];
  pages: PageRow[];
};

export async function createBackup(): Promise<Backup> {
  const [courses, modules, pages] = await Promise.all([
    desktop.storage.query<CourseRow>("SELECT * FROM course ORDER BY id"),
    desktop.storage.query<ModuleRow>("SELECT * FROM module ORDER BY id"),
    desktop.storage.query<PageRow>("SELECT * FROM page ORDER BY id"),
  ]);
  return { version: 1, exportedAt: new Date().toISOString(), courses, modules, pages };
}

export function downloadBackup(backup: Backup) {
  const fileName = `mneme-backup-${backup.exportedAt.slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
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

export function readBackupFile(file: File): Promise<Backup> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const backup = JSON.parse(String(reader.result));
        if (backup?.version !== 1 || !Array.isArray(backup.courses)) throw new Error("invalid");
        resolve(backup);
      } catch {
        reject(new Error("This file isn't a valid Mneme backup."));
      }
    };
    reader.onerror = () => reject(new Error("Couldn't read this file."));
    reader.readAsText(file);
  });
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
  for (const course of backup.courses) {
    await desktop.storage.execute(
      `INSERT OR IGNORE INTO course
        (id, name, description, icon, color, status, progress, bookmarked, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        course.id, course.name, course.description, course.icon, course.color,
        normalize(course.status, legacyStatus, 1), course.progress ?? 0, course.bookmarked ?? 0,
        course.created_at, course.updated_at,
      ],
    );
  }
  for (const module of backup.modules) {
    await desktop.storage.execute(
      `INSERT OR IGNORE INTO module
        (id, course_id, name, description, status, progress, bookmarked, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        module.id, module.course_id, module.name, module.description,
        normalize(module.status, legacyStatus, 1), module.progress ?? 0, module.bookmarked ?? 0,
        module.created_at, module.updated_at,
      ],
    );
  }
  for (const page of backup.pages) {
    await desktop.storage.execute(
      `INSERT OR IGNORE INTO page
        (id, module_id, title, type, content, status, progress, bookmarked, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        page.id, page.module_id, page.title, normalize(page.type, legacyPageType, 1), page.content,
        normalize(page.status, legacyStatus, 1), page.progress ?? 0, page.bookmarked ?? 0,
        page.created_at, page.updated_at,
      ],
    );
  }
}
