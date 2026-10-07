import { makeFlashcardsForImport } from "@/features/flashcards/lib/autoFlashcards";
import { addImportedTasks } from "@/features/tasks/lib/fromImport";
import { startJob } from "@/shared/lib/backgroundJobs";

import { detectContent, summaryHtml } from "./content-detection";
import { escapeAttr, type ImportMedia } from "./import-sanitize";
import { storePageFile } from "./page-files";
import { appendToPage, createPage } from "./page/actions";
import { PageType } from "./page/types";
import { createRecording, renameRecording, saveTranscript } from "./recording/actions";
import { transcriptHtml } from "./recording/types";
import { transcribeError, transcribeFile } from "./transcription";

export const transcribeJobScope = (pageId: number) => `transcribe:${pageId}`;

let transcribing = Promise.resolve();

function mediaDuration(file: File) {
  return new Promise<number>((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const done = (milliseconds: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(milliseconds) ? milliseconds : 0);
    };
    audio.addEventListener("loadedmetadata", () => done(audio.duration * 1000));
    audio.addEventListener("error", () => done(0));
    audio.preload = "metadata";
    audio.src = url;
  });
}

function noSound(error: unknown) {
  return (
    (error as { code?: string } | null)?.code === "NOT_FOUND" &&
    /sound/i.test(String((error as Error).message))
  );
}

function transcribeInBackground(
  page: { id: number; title: string },
  reference: string,
  courseId: number,
  moduleId: number,
  recordingId: number | null
) {
  const path = `/courses/${courseId}/modules/${moduleId}/pages/${page.id}`;
  const job = startJob(
    transcribeJobScope(page.id),
    "Transcribing",
    `${page.title} · waiting for the one before`
  );
  transcribing = transcribing.then(async () => {
    try {
      job.update(`${page.title} · starting`, null);
      const transcript = await transcribeFile(reference, (progress) =>
        job.update(`${page.title} · ${Math.round(progress * 100)}%`, progress)
      );
      const text = recordingId
        ? await saveTranscript(recordingId, transcript)
        : transcript.segments
            .map((segment) => segment.text.trim())
            .filter(Boolean)
            .join("\n");
      const paragraphs = transcriptHtml(text);
      if (!paragraphs) {
        job.fail("No speech found", `${page.title}: no speech was found to transcribe.`);
        return;
      }
      const found = detectContent(page.title, paragraphs);
      await appendToPage(page.id, `<h2>Transcript</h2>${summaryHtml(found)}${paragraphs}`);
      await addImportedTasks({
        page,
        pageTask: null,
        activities: found.activities,
        dueDates: found.dueDates,
        courseId,
        moduleId
      }).catch(() => 0);
      void makeFlashcardsForImport(
        moduleId,
        { id: page.id, title: page.title, content: paragraphs },
        courseId
      ).catch(() => undefined);
      job.finish("Transcript ready", page.title, { label: "Open page", path });
    } catch (error) {
      if (noSound(error)) job.fail("No sound to transcribe", `“${page.title}” has no sound track.`);
      else job.fail("Couldn’t transcribe", `${page.title}: ${transcribeError(error)}`);
    }
  });
}

export async function saveMediaImport({
  courseId,
  moduleId,
  title,
  type = PageType.Lecture,
  media
}: {
  courseId: number;
  moduleId: number;
  title: string;
  type?: PageType;
  media: ImportMedia;
}) {
  const reference = await storePageFile(media.file);
  if (media.kind === "video") {
    const page = await createPage(moduleId, {
      title,
      type,
      content: `<div data-video="" data-file="${escapeAttr(reference)}"></div>`,
      source: media.file.name
    });
    transcribeInBackground(page, reference, courseId, moduleId, null);
    return page;
  }
  const page = await createPage(moduleId, { title, type, source: media.file.name });
  const recording = await createRecording(page.id, {
    file: reference,
    mimeType: media.file.type || "audio/mp4",
    durationMs: await mediaDuration(media.file)
  });
  await renameRecording(recording.id, title).catch(() => undefined);
  const withRecording = await appendToPage(
    page.id,
    `<div data-recording-id="${recording.id}"></div>`
  );
  transcribeInBackground(withRecording, reference, courseId, moduleId, recording.id);
  return withRecording;
}
