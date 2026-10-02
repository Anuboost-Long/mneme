import type { PageAudioRow } from "../../../../shared/lib/db/schema/page-audio";
import type { ReadableChunk, Sentence } from "../../../read-aloud/lib/readableText";

export type AudioSentence = Sentence & { from: number; to: number };

export type PageAudio = Omit<PageAudioRow, "sentences"> & { sentences: AudioSentence[] };

export function isOutdated(audio: PageAudio, chunks: ReadableChunk[]) {
  return audio.sentences.some(
    (sentence) => chunks[sentence.chunk]?.text.slice(sentence.start, sentence.end) !== sentence.text
  );
}
