import { useEffect, useRef, useState } from "react";

import { errorMessage } from "../../../shared/lib/errorMessage";
import { voiceModels, type VoiceExtension } from "../../extensions/lib/catalog";
import { isReady, refreshExtensions, useExtensions } from "../../extensions/lib/extensionsState";
import { DownloadedVoicePlayer, warmUp } from "./downloadedVoicePlayer";
import { keepInView, paintHighlight } from "./highlight";
import { textRange, type ReadableChunk } from "./readableText";

export const RATES = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;

const RATE_KEY = "mneme.readAloud.rate";
const VOICE_KEY = "mneme.readAloud.voice";
const WAITING_LABEL_DELAY = 500;
const VOLUME_KEY = "mneme.readAloud.volume";
// A system voice can't change volume mid-utterance, so it restarts at the
// current word — once the slider settles, not on every step of a drag.
const VOLUME_RESTART_DELAY = 300;
// A downloaded voice can't abandon a sentence it's already synthesizing,
// so each skip that started reading would queue one more before the
// paragraph the listener lands on. Reading starts once skipping settles.
const SKIP_SETTLE_DELAY = 400;

// Characters [start, end) of chunk `chunk`'s text.
type SpokenWord = { chunk: number; start: number; end: number };

export type ReadAloudStatus = "idle" | "preparing" | "playing" | "paused";

// A system voice (speechSynthesis, id = its voiceURI) or one speaker of a
// downloaded voice model (desktop.tts, id = "<model id>:<speaker>").
export type ReadAloudVoice = {
  id: string;
  name: string;
  lang: string;
  isDefault: boolean;
  downloaded?: { model: VoiceExtension; speaker: number };
};

function stored(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
}

function systemVoices(): ReadAloudVoice[] {
  if (typeof speechSynthesis === "undefined") return [];
  return speechSynthesis
    .getVoices()
    .map((voice) => ({
      id: voice.voiceURI,
      name: voice.name,
      lang: voice.lang,
      isDefault: voice.default
    }));
}

export function downloadedVoices(installed: Parameters<typeof isReady>[1]): ReadAloudVoice[] {
  return voiceModels
    .filter((model) => isReady(model, installed))
    .flatMap((model) =>
      model.voices.map((voice, speaker) => ({
        id: `${model.manifest.id}:${speaker}`,
        name: voice.name,
        lang: voice.language,
        isDefault: false,
        downloaded: { model, speaker }
      }))
    );
}

function defaultVoice(voices: ReadAloudVoice[]) {
  const language = navigator.language.toLowerCase();
  return (
    voices.find((voice) => voice.id === stored(VOICE_KEY)) ??
    voices.find((voice) => voice.isDefault && voice.lang.toLowerCase() === language) ??
    voices.find((voice) => voice.lang.toLowerCase() === language) ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith(language.split("-")[0])) ??
    voices.find((voice) => voice.isDefault) ??
    voices[0]
  );
}

// Reads one chunk (a paragraph, heading or list item) at a time rather
// than the whole text at once: WebKit/Chromium drop or stall very long
// utterances, a downloaded voice synthesizes a chunk in a fraction of its
// playback time (so the next one is ready before the current ends), and a
// chunk boundary is where a changed speed or voice can take effect
// without losing the listener's place.
export function useReadAloud() {
  const { installed, onlyDownloaded } = useExtensions();
  const [system, setSystem] = useState(systemVoices);
  const downloaded = downloadedVoices(installed);
  const voices =
    onlyDownloaded.voice && downloaded.length > 0 ? downloaded : [...system, ...downloaded];
  const [chosenId, setChosenId] = useState<string | undefined>(
    () => stored(VOICE_KEY) ?? undefined
  );
  const voice = voices.find((item) => item.id === chosenId) ?? defaultVoice(voices);
  const [rate, setRate] = useState<number>(
    () => RATES.find((value) => String(value) === stored(RATE_KEY)) ?? 1
  );
  const [volume, setVolume] = useState<number>(() => {
    const saved = Number(stored(VOLUME_KEY) ?? 1);
    return Number.isFinite(saved) ? Math.min(1, Math.max(0, saved)) : 1;
  });
  const volumeRestart = useRef<ReturnType<typeof setTimeout>>(undefined);
  const settlingSkip = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [status, setStatus] = useState<ReadAloudStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [chunks, setChunks] = useState<ReadableChunk[]>([]);
  const [index, setIndex] = useState(0);
  const [word, setWord] = useState<SpokenWord | null>(null);
  // Outlives the pauses between words, when `word` is null.
  const lastWord = useRef<SpokenWord | null>(null);
  const settings = useRef({ voice, rate, volume });
  settings.current = { voice, rate, volume };
  const session = useRef(0);
  const player = useRef<DownloadedVoicePlayer | null>(null);
  const waitingLabel = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    void refreshExtensions();
    if (typeof speechSynthesis === "undefined") return;
    const refresh = () => setSystem(systemVoices());
    speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => {
      speechSynthesis.removeEventListener("voiceschanged", refresh);
      silence();
    };
  }, []);

  // Load a chosen downloaded voice's model in the background, so Listen
  // starts without waiting for it.
  const downloadedChoice = voice?.downloaded;
  useEffect(() => {
    if (!downloadedChoice) return;
    const timer = setTimeout(() => warmUp({ ...downloadedChoice, lang: "" }), 800);
    return () => clearTimeout(timer);
  }, [downloadedChoice?.model.manifest.id]);

  // The CSS Custom Highlight API paints the word without touching the DOM,
  // which the editor owns. Older WebKit (before macOS 14.2) lacks it and
  // just reads without highlighting.
  useEffect(() => {
    const within = word && chunks[word.chunk]?.range;
    const range = within && textRange(within, word.start, word.end);
    paintHighlight("read-aloud", range || null);
    if (range) keepInView(range);
    return () => paintHighlight("read-aloud", null);
  }, [word, chunks]);

  const supported = voices.length > 0;

  function hear(next: SpokenWord | null) {
    if (next) lastWord.current = next;
    setWord(next);
  }

  function silence() {
    session.current += 1;
    clearTimeout(waitingLabel.current);
    clearTimeout(settlingSkip.current);
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    player.current?.stop();
    player.current = null;
    setWord(null);
  }

  // `offset` starts partway into chunk `start` (see restartChunk).
  function speakFrom(texts: ReadableChunk[], start: number, offset = 0) {
    const { voice: target, rate: speed, volume: loudness } = settings.current;
    silence();
    const current = session.current;
    setError(null);
    if (start >= texts.length) {
      setStatus("idle");
      return;
    }
    setIndex(start);
    if (target?.downloaded) {
      playDownloaded(texts, start, offset, target, speed, loudness, current);
      return;
    }
    setStatus("playing");
    const text = texts[start].text;
    const utterance = new SpeechSynthesisUtterance(text.slice(offset));
    const systemVoice = speechSynthesis.getVoices().find((item) => item.voiceURI === target?.id);
    if (systemVoice) {
      utterance.voice = systemVoice;
      utterance.lang = systemVoice.lang;
    }
    utterance.rate = speed;
    utterance.volume = loudness;
    // WebKit leaves charLength at 0, so the word runs to the next space.
    utterance.onboundary = (event) => {
      if (session.current !== current || event.name !== "word") return;
      const at = offset + event.charIndex;
      const length = event.charLength || (/^\S*/.exec(text.slice(at))?.[0] ?? "").length;
      hear({ chunk: start, start: at, end: at + length });
    };
    utterance.onend = () => {
      if (session.current === current) speakFrom(texts, start + 1);
    };
    utterance.onerror = (event) => {
      if (
        session.current !== current ||
        event.error === "interrupted" ||
        event.error === "canceled"
      )
        return;
      speakFrom(texts, start + 1);
    };
    speechSynthesis.speak(utterance);
  }

  // A downloaded voice reads the rest of the text in one background
  // pipeline (see DownloadedVoicePlayer); its events keep the bar's
  // paragraph and status in step.
  function playDownloaded(
    texts: ReadableChunk[],
    start: number,
    offset: number,
    target: ReadAloudVoice,
    speed: number,
    loudness: number,
    current: number
  ) {
    const live = () => session.current === current;
    const notPaused = (next: ReadAloudStatus) => (previous: ReadAloudStatus) =>
      previous === "paused" ? previous : next;
    setStatus("playing");
    player.current = new DownloadedVoicePlayer(
      texts.map((item) => item.text),
      start,
      offset,
      { ...target.downloaded!, lang: target.lang },
      speed,
      loudness,
      {
        onParagraph: (paragraph) => {
          if (live()) setIndex(paragraph);
        },
        onWord: (spoken) => {
          if (live()) hear(spoken && { chunk: spoken.paragraph, start: spoken.start, end: spoken.end });
        },
        // Only a wait the listener would notice changes the label; a quick
        // one would just flash "Preparing voice…" and back.
        onWaiting: () => {
          clearTimeout(waitingLabel.current);
          waitingLabel.current = setTimeout(() => {
            if (live()) setStatus(notPaused("preparing"));
          }, WAITING_LABEL_DELAY);
        },
        onPlaying: () => {
          clearTimeout(waitingLabel.current);
          if (live()) setStatus(notPaused("playing"));
        },
        onEnd: () => {
          if (live()) {
            silence();
            setStatus("idle");
          }
        },
        onError: (error_) => {
          if (!live()) return;
          silence();
          setStatus("idle");
          setError(
            errorMessage(
              error_,
              `Couldn’t read with ${target.name}. Choose another voice or try again.`
            )
          );
        }
      }
    );
    player.current.start();
  }

  // Texts aren't trimmed: word positions index into them as they are on
  // screen, and the voices skip surrounding whitespace anyway.
  function read(texts: ReadableChunk[]) {
    const readable = texts.filter((item) => item.text.trim());
    if (!supported || readable.length === 0) return;
    setChunks(readable);
    speakFrom(readable, 0);
  }

  function pause() {
    if (player.current) player.current.pause();
    else speechSynthesis.pause();
    setStatus("paused");
  }

  // Continues a pause; after an error (nothing left to un-pause) it
  // re-reads the current paragraph instead.
  function resume() {
    if (status !== "paused") {
      speakFrom(chunks, index);
      return;
    }
    if (player.current) player.current.resume();
    else speechSynthesis.resume();
    setStatus("playing");
  }

  function stop() {
    silence();
    setStatus("idle");
    setError(null);
    setChunks([]);
  }

  function skip(delta: number) {
    const next = Math.max(0, Math.min(chunks.length - 1, index + delta));
    silence();
    setIndex(next);
    setStatus("preparing");
    settlingSkip.current = setTimeout(() => speakFrom(chunks, next), SKIP_SETTLE_DELAY);
  }

  // Picks up at the word being read, so a new voice or speed doesn't send
  // the listener back to the start of the paragraph.
  function restartChunk() {
    if (status === "playing" || status === "preparing")
      speakFrom(chunks, index, lastWord.current?.chunk === index ? lastWord.current.start : 0);
  }

  function chooseRate(next: number) {
    setRate(next);
    store(RATE_KEY, String(next));
    settings.current.rate = next;
    restartChunk();
  }

  function chooseVolume(next: number) {
    setVolume(next);
    store(VOLUME_KEY, String(next));
    settings.current.volume = next;
    if (player.current) {
      player.current.setVolume(next);
      return;
    }
    clearTimeout(volumeRestart.current);
    volumeRestart.current = setTimeout(restartChunk, VOLUME_RESTART_DELAY);
  }

  function chooseVoice(next: string) {
    setChosenId(next);
    store(VOICE_KEY, next);
    settings.current.voice = voices.find((item) => item.id === next) ?? settings.current.voice;
    restartChunk();
  }

  return {
    supported,
    voices,
    voiceId: voice?.id,
    rate,
    volume,
    status,
    error,
    index,
    total: chunks.length,
    read,
    pause,
    resume,
    stop,
    skip,
    chooseRate,
    chooseVolume,
    chooseVoice
  };
}

export type ReadAloud = ReturnType<typeof useReadAloud>;
