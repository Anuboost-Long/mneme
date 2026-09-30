import { desktop } from "@chain/sdk";

import type { VoiceExtension } from "../../extensions/lib/catalog";

// How many sentences are kept synthesized and decoded ahead of playback.
// Kokoro runs ~4× faster than real time, so a few is enough to never run
// dry, while stopping or skipping throws little work away.
const AHEAD = 6;
// Playback (re)starts only once this many are ready, so it doesn't start
// on one clip and immediately stall waiting for the next.
const START_BUFFER = 2;
const MIN_SEGMENT_CHARS = 40;

export type DownloadedVoice = { model: VoiceExtension; speaker: number; lang: string };

// `start` is where the text begins within its paragraph.
type Segment = { paragraph: number; text: string; start: number };

type Scheduled = {
  position: number;
  startAt: number;
  duration: number;
  words: ReturnType<typeof wordTimings>;
  speech: ReturnType<typeof speechCurve>;
};

function piece(paragraph: number, raw: string, at: number): Segment {
  return { paragraph, text: raw.trim(), start: at + raw.length - raw.trimStart().length };
}

// The voice gives no word timings, so each word gets a share of the
// clip's speech (see speechCurve) by its number of letters.
function wordTimings(text: string) {
  const words = Array.from(text.matchAll(/\S+/g), (match) => ({
    start: match.index,
    end: match.index + match[0].length,
    weight: match[0].replace(/[^\p{L}\p{N}]/gu, "").length + 1
  }));
  const total = words.reduce((sum, word) => sum + word.weight, 0);
  let elapsed = 0;
  return words.map((word) => {
    const at = elapsed / total;
    elapsed += word.weight;
    return { ...word, at };
  });
}

// Sentence-sized pieces: the first sound arrives after one short sentence
// is synthesized, not a whole paragraph. Very short sentences ride along
// with the next one so playback doesn't turn choppy.
function segment(texts: string[], lang: string): Segment[] {
  const segmenter = new Intl.Segmenter(lang, { granularity: "sentence" });
  return texts.flatMap((text, paragraph) => {
    const pieces: Segment[] = [];
    let pending = "";
    let pendingStart = 0;
    for (const { segment: sentence, index } of segmenter.segment(text)) {
      if (!pending) pendingStart = index;
      pending += sentence;
      if (pending.trim().length >= MIN_SEGMENT_CHARS) {
        pieces.push(piece(paragraph, pending, pendingStart));
        pending = "";
      }
    }
    if (pending.trim()) pieces.push(piece(paragraph, pending, pendingStart));
    return pieces;
  });
}

const FRAME_SECONDS = 0.01;
// Relative to the clip's loudest frame; low enough to keep quiet
// consonants, high enough to drop the breath between words.
const SPEECH_THRESHOLD = 0.05;

// How much of the clip's speech has passed by each 10 ms frame, 0–1. The
// voice's silent lead-in and tail and its pauses at punctuation don't
// count, so the highlight waits through them instead of running ahead.
function speechCurve(buffer: AudioBuffer) {
  const samples = buffer.getChannelData(0);
  const size = Math.max(1, Math.round(buffer.sampleRate * FRAME_SECONDS));
  const energy = new Float32Array(Math.ceil(samples.length / size));
  let peak = 0;
  for (let frame = 0; frame < energy.length; frame++) {
    const from = frame * size;
    const to = Math.min(samples.length, from + size);
    let sum = 0;
    for (let index = from; index < to; index++) sum += samples[index] ** 2;
    energy[frame] = Math.sqrt(sum / (to - from));
    peak = Math.max(peak, energy[frame]);
  }
  const curve = new Float32Array(energy.length);
  let spoken = 0;
  let lastSpoken = 0;
  energy.forEach((value, frame) => {
    if (value > peak * SPEECH_THRESHOLD) {
      spoken += 1;
      lastSpoken = frame;
    }
    curve[frame] = spoken;
  });
  return { progress: curve.map((value) => value / Math.max(1, spoken)), lastSpoken };
}

export type PlayerEvents = {
  onParagraph: (paragraph: number) => void;
  /** The word being heard (characters [start, end) of that paragraph), or null between words' speech. */
  onWord: (word: { paragraph: number; start: number; end: number } | null) => void;
  onWaiting: () => void;
  onPlaying: () => void;
  onEnd: () => void;
  onError: (error: unknown) => void;
};

// Synthesizes ahead in the background and plays pieces back to back on
// one Web Audio clock, so there's no gap or per-piece load between them.
// One player reads one run; skipping or changing voice/speed starts a new
// one.
export class DownloadedVoicePlayer {
  private readonly context = new AudioContext();
  private readonly output = this.context.createGain();
  private readonly segments: Segment[];
  private readonly buffers = new Map<number, AudioBuffer>();
  private synthesizing = false;
  private nextToSynthesize = 0;
  private nextToSchedule = 0;
  private playing = 0;
  private scheduledUntil = 0;
  private readonly sources = new Set<AudioBufferSourceNode>();
  private stopped = false;
  private readonly timeline: Scheduled[] = [];
  private frame = 0;
  private word = "";

  constructor(
    texts: string[],
    from: number,
    offset: number,
    private readonly voice: DownloadedVoice,
    private readonly speed: number,
    volume: number,
    private readonly events: PlayerEvents
  ) {
    this.output.gain.value = volume;
    this.output.connect(this.context.destination);
    this.segments = segment(texts, voice.lang);
    // Starts `offset` characters into paragraph `from`: mid-sentence, when
    // a voice or speed change picks up where the listener was.
    const first = this.segments.findIndex(
      (item) =>
        item.paragraph > from || (item.paragraph === from && item.start + item.text.length > offset)
    );
    const partial = this.segments[first];
    if (partial?.paragraph === from && offset > partial.start) {
      this.segments[first] = {
        ...partial,
        text: partial.text.slice(offset - partial.start),
        start: offset
      };
    }
    this.nextToSynthesize =
      this.nextToSchedule =
      this.playing =
        first === -1 ? this.segments.length : first;
  }

  start() {
    void this.context.resume();
    this.events.onWaiting();
    void this.fill();
    this.frame = requestAnimationFrame(this.follow);
  }

  // Follows the audio clock, so a suspended context (pause) holds the word.
  private readonly follow = () => {
    const now = this.context.currentTime;
    const current = this.timeline.find((item) => now >= item.startAt && now < item.startAt + item.duration);
    const frame = current ? Math.floor((now - current.startAt) / FRAME_SECONDS) : 0;
    // After the clip's last speech (its silent tail) or between clips,
    // nothing is being said, so nothing stays highlighted.
    if (!current || frame > current.speech.lastSpoken) {
      if (this.word) this.events.onWord(null);
      this.word = "";
    } else {
      const segment = this.segments[current.position];
      const progress = current.speech.progress[frame];
      const word = current.words.filter((item) => item.at <= progress).pop() ?? current.words[0];
      const key = `${current.position}:${word?.start}`;
      if (word && key !== this.word) {
        this.word = key;
        this.events.onWord({
          paragraph: segment.paragraph,
          start: segment.start + word.start,
          end: segment.start + word.end
        });
      }
    }
    this.frame = requestAnimationFrame(this.follow);
  };

  // A short ramp, so dragging the slider doesn't click.
  setVolume(volume: number) {
    this.output.gain.setTargetAtTime(volume, this.context.currentTime, 0.02);
  }

  pause() {
    void this.context.suspend();
  }

  resume() {
    void this.context.resume();
  }

  stop() {
    this.stopped = true;
    cancelAnimationFrame(this.frame);
    for (const source of this.sources) {
      source.onended = null;
      source.stop();
    }
    this.sources.clear();
    this.buffers.clear();
    void this.context.close();
  }

  private async fill() {
    if (this.synthesizing) return;
    this.synthesizing = true;
    try {
      while (
        !this.stopped &&
        this.nextToSynthesize < this.segments.length &&
        this.nextToSynthesize - this.playing < AHEAD
      ) {
        const position = this.nextToSynthesize++;
        this.buffers.set(position, await this.synthesize(this.segments[position].text));
        this.schedule();
      }
    } catch (error) {
      if (!this.stopped) this.events.onError(error);
    } finally {
      this.synthesizing = false;
    }
    if (!this.stopped && this.nextToSchedule >= this.segments.length && this.sources.size === 0)
      this.events.onEnd();
  }

  private async synthesize(text: string) {
    const { model, speaker } = this.voice;
    const reference = await desktop.tts.synthesize(text, {
      modelId: model.manifest.id,
      config: model.config,
      voice: speaker,
      speed: this.speed
    });
    try {
      const bytes = await desktop.files.read(reference);
      return await this.context.decodeAudioData(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
      );
    } finally {
      void desktop.files.delete(reference).catch(() => undefined);
    }
  }

  private readyInARow() {
    let count = 0;
    while (this.buffers.has(this.nextToSchedule + count)) count += 1;
    return count;
  }

  private schedule() {
    const remaining = this.segments.length - this.nextToSchedule;
    if (this.sources.size === 0 && this.readyInARow() < Math.min(START_BUFFER, remaining)) return;
    while (!this.stopped && this.buffers.has(this.nextToSchedule)) {
      const position = this.nextToSchedule++;
      const buffer = this.buffers.get(position)!;
      this.buffers.delete(position);
      const source = this.context.createBufferSource();
      source.buffer = buffer;
      source.connect(this.output);
      const idle = this.sources.size === 0;
      const startAt = Math.max(this.context.currentTime + 0.05, this.scheduledUntil);
      this.scheduledUntil = startAt + buffer.duration;
      this.timeline.push({
        position,
        startAt,
        duration: buffer.duration,
        words: wordTimings(this.segments[position].text),
        speech: speechCurve(buffer)
      });
      this.sources.add(source);
      source.onended = () => this.finished(source, position);
      source.start(startAt);
      if (idle) {
        this.events.onParagraph(this.segments[position].paragraph);
        this.events.onPlaying();
      }
    }
  }

  private finished(source: AudioBufferSourceNode, position: number) {
    this.sources.delete(source);
    this.timeline.splice(0, this.timeline.findIndex((item) => item.position === position) + 1);
    this.playing = position + 1;
    if (this.playing >= this.segments.length) {
      this.events.onEnd();
      return;
    }
    if (this.sources.size === 0) this.events.onWaiting();
    else this.events.onParagraph(this.segments[this.playing].paragraph);
    void this.fill();
  }
}

// Loads the model in the background so the first Listen doesn't wait for
// it; desktop.tts keeps one model loaded between calls.
export function warmUp(voice: DownloadedVoice) {
  void desktop.tts.voices(voice.model.manifest.id, voice.model.config).catch(() => undefined);
}
