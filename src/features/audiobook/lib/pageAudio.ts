import { desktop } from "@chain/sdk";

import type { PageAudioRow } from "../../../shared/lib/db/schema/page-audio";
import { sentences, type ReadableChunk, type Sentence } from "../../read-aloud/lib/readableText";
import type { ReadAloudVoice } from "../../read-aloud/lib/useReadAloud";

// A sentence of the page and where it plays, in seconds.
export type AudioSentence = Sentence & { from: number; to: number };

export type PageAudio = Omit<PageAudioRow, "sentences"> & { sentences: AudioSentence[] };

export async function getPageAudio(pageId: number): Promise<PageAudio | null> {
  const [row] = await desktop.storage.query<PageAudioRow>(
    "SELECT * FROM page_audio WHERE page_id = ?",
    [pageId]
  );
  return row ? { ...row, sentences: JSON.parse(row.sentences) as AudioSentence[] } : null;
}

// Replaces any audio the page already has, but only once the new file is
// saved, so a failed or cancelled compile keeps the old one.
export async function compilePageAudio(
  pageId: number,
  chunks: ReadableChunk[],
  voice: ReadAloudVoice,
  speed: number,
  onProgress: (fraction: number) => void
): Promise<PageAudio> {
  if (!voice.downloaded) throw new Error("Choose a downloaded voice to create audio.");
  const spoken = sentences(chunks, voice.lang);
  if (spoken.length === 0) throw new Error("This page has no text to read.");
  const { model, speaker } = voice.downloaded;
  const compiled = await desktop.tts.compile(
    spoken.map((sentence) => sentence.text),
    { modelId: model.manifest.id, config: model.config, voice: speaker, speed },
    onProgress
  );
  const timed = spoken.map((sentence, index) => ({
    ...sentence,
    from: compiled.segments[index].start,
    to: compiled.segments[index].end
  }));
  const previous = await getPageAudio(pageId);
  try {
    await desktop.storage.execute(
      `INSERT OR REPLACE INTO page_audio
        (page_id, file_reference, duration_ms, voice_id, voice_name, speed, sentences)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        pageId,
        compiled.file,
        Math.round(compiled.duration * 1000),
        voice.id,
        voice.name,
        speed,
        JSON.stringify(timed)
      ]
    );
  } catch (error) {
    await desktop.files.delete(compiled.file);
    throw error;
  }
  if (previous) await desktop.files.delete(previous.file_reference).catch(() => undefined);
  const saved = await getPageAudio(pageId);
  if (!saved) throw new Error("The saved audio could not be found.");
  return saved;
}

export function cancelCompile() {
  return desktop.tts.cancel();
}

export async function deletePageAudio(pageId: number) {
  await deletePageAudios("page_id = ?", [pageId]);
}

// The audio file lives in desktop.files, which the database can't delete
// along with the row. Page, module and course deletes call this first.
export async function deletePageAudios(filter: string, params: unknown[]) {
  const rows = await desktop.storage.query<{ file_reference: string }>(
    `SELECT file_reference FROM page_audio WHERE ${filter}`,
    params
  );
  for (const { file_reference } of rows) await desktop.files.delete(file_reference);
  await desktop.storage.execute(`DELETE FROM page_audio WHERE ${filter}`, params);
}

// The page's text no longer matches what was spoken, so the sentence
// positions can't be trusted for highlighting.
export function isOutdated(audio: PageAudio, chunks: ReadableChunk[]) {
  return audio.sentences.some(
    (sentence) => chunks[sentence.chunk]?.text.slice(sentence.start, sentence.end) !== sentence.text
  );
}
