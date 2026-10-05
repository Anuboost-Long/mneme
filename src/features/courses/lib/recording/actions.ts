import { desktop, sql, type SqlFragment, type Transcript } from "@chain/sdk";

import {
  deleteRecordingRows,
  getRecording,
  getRecordings,
  insertRecording,
  updateRecordingColumns
} from "./table";
import type { RecordedAudio } from "./types";

export { getAllRecordings, getPageRecordings, getRecording } from "./table";

const EXTENSIONS: Record<string, string> = {
  "audio/mp4": "m4a",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/wav": "wav"
};

export async function storeRecordedAudio(audio: Blob, durationMs: number): Promise<RecordedAudio> {
  const mimeType = audio.type.split(";")[0].trim() || "audio/mp4";
  const file = await desktop.files.write(new Uint8Array(await audio.arrayBuffer()), {
    extension: EXTENSIONS[mimeType] ?? "m4a"
  });
  return { file, mimeType: audio.type || mimeType, durationMs };
}

export function createRecording(pageId: number | null, audio: RecordedAudio) {
  const name = `Recording ${new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`;
  return insertRecording({
    page_id: pageId,
    name,
    file_reference: audio.file,
    mime_type: audio.mimeType,
    duration_ms: Math.round(audio.durationMs)
  });
}

export async function discardRecordedAudio(audio: RecordedAudio) {
  await desktop.files.delete(audio.file);
}

export async function copyRecordings(content: string, pageId: number) {
  let copied = content;
  const ids = new Set(
    Array.from(content.matchAll(/data-recording-id="(\d+)"/g), (match) => Number(match[1]))
  );
  for (const id of ids) {
    const recording = await getRecording(id);
    if (!recording) continue;
    const bytes = await desktop.files.read(recording.file_reference);
    const reference = await desktop.files.write(bytes, {
      extension: EXTENSIONS[recording.mime_type.split(";")[0]] ?? "m4a"
    });
    const copy = await insertRecording({
      page_id: pageId,
      name: recording.name,
      file_reference: reference,
      mime_type: recording.mime_type,
      duration_ms: recording.duration_ms,
      transcript: recording.transcript,
      segments: recording.segments
    });
    copied = copied.split(`data-recording-id="${id}"`).join(`data-recording-id="${copy.id}"`);
  }
  return copied;
}

export async function setRecordingPage(id: number, pageId: number) {
  await updateRecordingColumns(id, { page_id: pageId });
}

export async function renameRecording(id: number, name: string) {
  if (!name.trim()) throw new Error("Enter a recording name.");
  await updateRecordingColumns(id, { name: name.trim() });
}

export async function deleteRecording(id: number) {
  await deleteRecordings(sql`id = ${id}`);
}

export async function deleteRecordings(filter: SqlFragment) {
  for (const { file_reference } of await getRecordings(filter))
    await desktop.files.delete(file_reference);
  await deleteRecordingRows(filter);
}

export async function saveTranscript(id: number, transcript: Transcript) {
  const text = transcript.segments
    .map((segment) => segment.text.trim())
    .filter(Boolean)
    .join("\n");
  await updateRecordingColumns(id, {
    transcript: text,
    segments: JSON.stringify(transcript.segments)
  });
  return text;
}

export async function updateTranscriptText(id: number, text: string) {
  await updateRecordingColumns(id, { transcript: text });
}
