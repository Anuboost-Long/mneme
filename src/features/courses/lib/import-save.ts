import { makeFlashcardsForImport } from "@/features/flashcards/lib/autoFlashcards";
import { addImportedTasks, pageTaskType } from "@/features/tasks/lib/fromImport";

import {
  detectContent,
  kindPageTypes,
  summaryHtml,
  type ContentKind,
  type DueDate,
  type LinkedFile
} from "./content-detection";
import { parseImportFile } from "./file-import";
import { saveMediaImport } from "./import-media";
import type { ParsedImport } from "./import-sanitize";
import { createPage } from "./page/actions";
import type { Page } from "./page/types";

export type ImportFindings = { dueDates: DueDate[]; activities: string[]; files: LinkedFile[] };

export async function saveImport({
  courseId,
  moduleId,
  parsed,
  findings,
  kind,
  source
}: {
  courseId: number;
  moduleId: number;
  parsed: ParsedImport;
  findings: ImportFindings;
  kind?: ContentKind;
  source: string | null;
}) {
  const page = await createPage(moduleId, {
    title: parsed.title,
    type: parsed.type,
    content: summaryHtml(findings) + parsed.html,
    source
  });
  await addImportedTasks({
    page,
    pageTask: pageTaskType(parsed.type, kind),
    activities: findings.activities,
    dueDates: findings.dueDates,
    courseId,
    moduleId
  }).catch(() => 0);
  void makeFlashcardsForImport(
    moduleId,
    { id: page.id, title: page.title, content: parsed.html },
    courseId
  ).catch(() => undefined);
  return page;
}

export function detectAll(parsed: ParsedImport, url?: string) {
  const found = detectContent(parsed.title, parsed.html, { url });
  return {
    parsed: { ...parsed, type: kindPageTypes[found.kind] },
    kind: found.kind,
    findings: { dueDates: found.dueDates, activities: found.activities, files: found.files }
  };
}

export type ImportStatus =
  { state: "waiting" | "importing" | "done" } | { state: "failed"; reason: string };

async function importFile(file: File, courseId: number, moduleId: number) {
  const read = await parseImportFile(file);
  if (read.media)
    return saveMediaImport({ courseId, moduleId, title: read.title, media: read.media });
  if (!read.html) throw new Error("Couldn’t find any content in it.");
  const { parsed, kind, findings } = detectAll(read);
  return saveImport({ courseId, moduleId, parsed, findings, kind, source: file.name });
}

export async function importFiles(
  files: File[],
  courseId: number,
  moduleId: number,
  onStatus: (index: number, status: ImportStatus) => void,
  onImported: (page: Page) => void
) {
  for (const [index, file] of files.entries()) {
    onStatus(index, { state: "importing" });
    try {
      onImported(await importFile(file, courseId, moduleId));
      onStatus(index, { state: "done" });
    } catch (error) {
      onStatus(index, {
        state: "failed",
        reason: error instanceof Error ? error.message : "Couldn’t import it."
      });
    }
  }
}
