import { escapeHtml } from "@/features/courses/lib/import-sanitize";
import type { RecordingRow } from "@/shared/lib/db/schema/recording";

export type Recording = RecordingRow;

export type RecordedAudio = { file: string; mimeType: string; durationMs: number };

export type RecordingListItem = Recording & {
  page_title: string | null;
  module_id: number | null;
  module_name: string | null;
  course_id: number | null;
  course_name: string | null;
  course_color: string | null;
};

export function transcriptHtml(transcript: string) {
  return transcript
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}
