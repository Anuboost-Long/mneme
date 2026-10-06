import type { ReadableChunk, Sentence } from "@/features/read-aloud/lib/readableText";
import type { PageAudioRow } from "@/shared/lib/db/schema/page-audio";

export type AudioSentence = Sentence & { from: number; to: number };

export type PageAudio = Omit<PageAudioRow, "sentences"> & { sentences: AudioSentence[] };

export function isOutdated(audio: PageAudio, chunks: ReadableChunk[]) {
  return audio.sentences.some(
    (sentence) => chunks[sentence.chunk]?.text.slice(sentence.start, sentence.end) !== sentence.text
  );
}
