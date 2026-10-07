import { sentences, type ReadableChunk } from "@/features/read-aloud/lib/readableText";
import type { ReadAloudVoice } from "@/features/read-aloud/lib/useReadAloud";
import { desktop, sql, type SqlFragment } from "@chain/sdk";

import { deletePageAudioRows, getPageAudio, getPageAudios, replacePageAudio } from "./table";
import type { PageAudio } from "./types";

export { getPageAudio } from "./table";

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
    await replacePageAudio({
      page_id: pageId,
      file_reference: compiled.file,
      duration_ms: Math.round(compiled.duration * 1000),
      voice_id: voice.id,
      voice_name: voice.name,
      speed,
      sentences: JSON.stringify(timed)
    });
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
  await deletePageAudios(sql`page_id = ${pageId}`);
}

export async function deletePageAudios(filter: SqlFragment) {
  for (const { file_reference } of await getPageAudios(filter))
    await desktop.files.delete(file_reference);
  await deletePageAudioRows(filter);
}
