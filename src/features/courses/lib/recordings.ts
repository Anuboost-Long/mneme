import { desktop, type Transcript } from "@chain/sdk";

import type { RecordingRow } from "../../../shared/lib/db/schema/recording";

export type Recording = RecordingRow;

const EXTENSIONS: Record<string, string> = {
  "audio/mp4": "m4a",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/wav": "wav"
};

export async function getRecording(id: number) {
  const [recording] = await desktop.storage.query<Recording>(
    "SELECT * FROM recording WHERE id = ?",
    [id]
  );
  return recording;
}

// A recording with where it lives, for the Recordings screen.
export type RecordingListItem = Recording & {
  page_title: string;
  module_id: number;
  module_name: string;
  course_id: number;
  course_name: string;
  course_color: string | null;
};

export function getAllRecordings() {
  return desktop.storage.query<RecordingListItem>(
    `SELECT recording.*, page.title AS page_title, page.module_id, module.name AS module_name,
       module.course_id, course.name AS course_name, course.color AS course_color
     FROM recording JOIN page ON page.id = recording.page_id JOIN module ON module.id = page.module_id
     JOIN course ON course.id = module.course_id
     WHERE page.deleted_at IS NULL
     ORDER BY recording.created_at DESC, recording.id DESC`
  );
}

export async function createRecording(pageId: number, audio: Blob, durationMs: number) {
  const mimeType = audio.type.split(";")[0].trim() || "audio/mp4";
  const reference = await desktop.files.write(new Uint8Array(await audio.arrayBuffer()), {
    extension: EXTENSIONS[mimeType] ?? "m4a"
  });
  const name = `Recording ${new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`;
  try {
    const result = await desktop.storage.execute(
      "INSERT INTO recording (page_id, name, file_reference, mime_type, duration_ms) VALUES (?, ?, ?, ?, ?)",
      [pageId, name, reference, audio.type || mimeType, Math.round(durationMs)]
    );
    const recording = await getRecording(result.lastInsertId);
    if (!recording) throw new Error("The saved recording could not be found.");
    return recording;
  } catch (error) {
    await desktop.files.delete(reference);
    throw error;
  }
}

// Gives a duplicated page its own copy of each recording it embeds, so
// deleting either page leaves the other's audio intact. Returns `content`
// pointing at the copies.
export async function copyRecordings(content: string, pageId: number) {
  let copied = content;
  const ids = new Set(Array.from(content.matchAll(/data-recording-id="(\d+)"/g), (match) => Number(match[1])));
  for (const id of ids) {
    const recording = await getRecording(id);
    if (!recording) continue;
    const bytes = await desktop.files.read(recording.file_reference);
    const reference = await desktop.files.write(bytes, { extension: EXTENSIONS[recording.mime_type.split(";")[0]] ?? "m4a" });
    const result = await desktop.storage.execute(
      "INSERT INTO recording (page_id, name, file_reference, mime_type, duration_ms, transcript, segments) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [pageId, recording.name, reference, recording.mime_type, recording.duration_ms, recording.transcript, recording.segments]
    );
    copied = copied.split(`data-recording-id="${id}"`).join(`data-recording-id="${result.lastInsertId}"`);
  }
  return copied;
}

export async function renameRecording(id: number, name: string) {
  if (!name.trim()) throw new Error("Enter a recording name.");
  await desktop.storage.execute(
    "UPDATE recording SET name = ?, updated_at = datetime('now') WHERE id = ?",
    [name.trim(), id]
  );
}

export async function deleteRecording(id: number) {
  await deleteRecordings("id = ?", [id]);
}

// Audio lives in desktop.files, which the database can't delete along with
// the rows — and foreign keys aren't enforced, so ON DELETE CASCADE never
// fires either. Page, module and course deletes call this first.
export async function deleteRecordings(filter: string, params: unknown[]) {
  const rows = await desktop.storage.query<{ file_reference: string }>(
    `SELECT file_reference FROM recording WHERE ${filter}`,
    params
  );
  for (const { file_reference } of rows) await desktop.files.delete(file_reference);
  await desktop.storage.execute(`DELETE FROM recording WHERE ${filter}`, params);
}

// Each segment becomes its own line, so the transcript reads (and later
// inserts) as phrase-sized paragraphs rather than one hour-long block.
export async function saveTranscript(id: number, transcript: Transcript) {
  const text = transcript.segments
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join("\n");
  await desktop.storage.execute(
    "UPDATE recording SET transcript = ?, segments = ?, updated_at = datetime('now') WHERE id = ?",
    [text, JSON.stringify(transcript.segments), id]
  );
  return text;
}

export async function updateTranscriptText(id: number, text: string) {
  await desktop.storage.execute(
    "UPDATE recording SET transcript = ?, updated_at = datetime('now') WHERE id = ?",
    [text, id]
  );
}
