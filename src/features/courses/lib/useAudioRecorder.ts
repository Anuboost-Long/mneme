import {
  desktop,
  type RecordingAvailability,
  type RecordingSource,
  type RecordingStarted,
  type StartRecordingOptions
} from "@chain/sdk";
import { useEffect, useRef, useState } from "react";

import { useStoredChoice, useStoredString } from "../../../shared/lib/useStoredChoice";
import { storeRecordedAudio } from "./recording/actions";
import type { RecordedAudio } from "./recording/types";

// AAC in MP4: what WKWebView records by default, and a format the
// model-based transcriber can decode (its decoder has no Opus, which is
// WebView2's default).
const PREFERRED_TYPE = "audio/mp4;codecs=mp4a.40.2";

export type RecorderStatus = "idle" | "starting" | "recording" | "paused";

// About four seconds of loudness history, one sample every 40 ms.
export const WAVEFORM_LENGTH = 96;
const SAMPLE_MS = 40;

type Session = {
  native: boolean;
  recorder: MediaRecorder | null;
  stream: MediaStream | null;
  audio: AudioContext | null;
  chunks: Blob[];
  elapsedMs: number;
  resumedAt: number | null;
  frame: number;
  envelope: number;
  sampledAt: number;
  waveform: number[];
};

export type DeniedAccess = "microphone" | "system";

const accessDenied: Record<DeniedAccess, string> = {
  microphone: "Microphone access is off for mneme.",
  system: "Computer audio recording is off for mneme."
};

export const recordingSources: RecordingSource[] = ["microphone", "system", "both"];

export const recordingSourceLabels: Record<RecordingSource, string> = {
  microphone: "Microphone",
  system: "Computer audio",
  both: "Microphone and computer"
};

let availability: Promise<RecordingAvailability | null> | null = null;

export function recorderAvailability() {
  availability ??= desktop.audioRecorder.availability().catch(() => null);
  return availability;
}

async function availableSources() {
  const available = await recorderAvailability();
  return recordingSources.filter((source) => available?.[source]);
}

export type RecordingOption = "echoCancellation" | "noiseSuppression" | "autoGainControl";

const optionDefaults: Record<RecordingOption, "on" | "off"> = {
  echoCancellation: "on",
  noiseSuppression: "off",
  autoGainControl: "off"
};

export function useRecordingOption(option: RecordingOption) {
  return useStoredChoice(`mneme.recording.${option}`, ["on", "off"] as const, optionDefaults[option]);
}

export const AUTOMATIC_MICROPHONE = "automatic";

export function useRecordingMicrophone() {
  return useStoredString("mneme.recording.microphone", AUTOMATIC_MICROPHONE);
}

function isUnavailable(error: unknown) {
  return (error as { code?: string } | null)?.code === "UNAVAILABLE";
}

function microphoneError(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError") return accessDenied.microphone;
  if (name === "NotFoundError") return "No microphone found. Connect one and try again.";
  if (name === "NotReadableError")
    return "The microphone is in use by another app. Close it and try again.";
  return "Couldn’t start recording. Try again.";
}

// Maps RMS onto a -54…-6 dBFS window, so quiet speech still moves the
// waveform and shouting doesn't pin it.
function loudness(samples: Uint8Array) {
  let sum = 0;
  for (const sample of samples) sum += ((sample - 128) / 128) ** 2;
  const decibels = 20 * Math.log10(Math.sqrt(sum / samples.length) || 1e-5);
  return Math.min(1, Math.max(0, (decibels + 54) / 48));
}

function nativeError(error: unknown, source: RecordingSource) {
  const { code, message } = (error ?? {}) as { code?: string; message?: string };
  if (code === "PERMISSION_DENIED") {
    const system =
      source === "system" || (source === "both" && /computer|system/i.test(message ?? ""));
    return accessDenied[system ? "system" : "microphone"];
  }
  if (code === "UNSUPPORTED") return "This kind of recording isn’t available on this computer.";
  return "Couldn’t start recording. Try again.";
}

function elapsed(session: Session) {
  return (
    session.elapsedMs + (session.resumedAt === null ? 0 : performance.now() - session.resumedAt)
  );
}

// Records natively (desktop.audioRecorder: the microphone, the computer's
// own audio, or both mixed) where the OS supports it, otherwise the
// microphone through the webview's getUserMedia + MediaRecorder. Either way
// the take ends as a desktop.files file, and the paused span is left out of
// both the audio and the duration.
export function useAudioRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [durationMs, setDurationMs] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<RecordingSource[]>(["microphone"]);
  const [chosen, setSource] = useStoredChoice<RecordingSource>(
    "mneme.recording.source",
    recordingSources,
    "microphone"
  );
  const source = sources.includes(chosen) ? chosen : "microphone";
  const [available, setAvailable] = useState<RecordingAvailability | null>(null);
  const [echo] = useRecordingOption("echoCancellation");
  const [noise] = useRecordingOption("noiseSuppression");
  const [gain] = useRecordingOption("autoGainControl");
  const echoCancellation = Boolean(available?.echoCancellation) && echo === "on";
  const [chosenMicrophone, setMicrophone] = useRecordingMicrophone();
  const [inUse, setInUse] = useState<RecordingStarted | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const session = useRef<Session | null>(null);

  useEffect(() => {
    let active = true;
    void availableSources().then(
      (available) => active && available.length > 0 && setSources(available)
    );
    void recorderAvailability().then(
      (loaded) => active && setAvailable(loaded)
    );
    return () => {
      active = false;
      release();
    };
  }, []);

  function release() {
    const current = session.current;
    if (!current) return;
    session.current = null;
    cancelAnimationFrame(current.frame);
    if (current.native) {
      void desktop.audioRecorder.cancel().catch(() => undefined);
      return;
    }
    if (current.recorder && current.recorder.state !== "inactive") current.recorder.stop();
    current.stream?.getTracks().forEach((track) => track.stop());
    void current.audio?.close();
  }

  function newSession(native: boolean, recorder: MediaRecorder | null = null): Session {
    return {
      native,
      recorder,
      stream: null,
      audio: null,
      chunks: [],
      elapsedMs: 0,
      resumedAt: performance.now(),
      frame: 0,
      envelope: 0,
      sampledAt: performance.now(),
      waveform: []
    };
  }

  function tickDuration(current: Session) {
    setDurationMs(elapsed(current));
    current.frame = requestAnimationFrame(() => tickDuration(current));
  }

  async function startNative(source: RecordingSource) {
    const current = newSession(true);
    session.current = current;
    const options: StartRecordingOptions = {
      source,
      echoCancellation,
      noiseSuppression: Boolean(available?.noiseSuppression) && noise === "on",
      autoGainControl: Boolean(available?.autoGainControl) && gain === "on",
      onLevel: (level) => {
        current.waveform = [...current.waveform, level].slice(-WAVEFORM_LENGTH);
        setWaveform(current.waveform);
      },
      onMicrophoneChange: ({ microphone, previous, bluetoothFallback }) => {
        setInUse({ microphone, bluetoothFallback });
        setNotice(`${previous.name} was disconnected, so recording carried on with ${microphone.name}.`);
      }
    };
    const automatic = { ...options, avoidBluetoothMicrophone: true };
    const chosen =
      chosenMicrophone === AUTOMATIC_MICROPHONE ? automatic : { ...options, microphone: chosenMicrophone };
    try {
      if (!available?.microphoneChoice) {
        setInUse(await desktop.audioRecorder.start(options));
      } else {
        try {
          setInUse(await desktop.audioRecorder.start(chosen));
        } catch (error_) {
          if (chosen === automatic || !isUnavailable(error_)) throw error_;
          setInUse(await desktop.audioRecorder.start(automatic));
          setNotice("The microphone chosen in Settings isn’t connected, so the automatic one is recording.");
        }
      }
    } catch (error_) {
      session.current = null;
      setError(nativeError(error_, source));
      setStatus("idle");
      return;
    }
    current.resumedAt = performance.now();
    tickDuration(current);
    setDurationMs(0);
    setStatus("recording");
  }

  async function start() {
    setError(null);
    setNotice(null);
    setInUse(null);
    setStatus("starting");
    const available = await availableSources();
    const picked = available.includes(chosen) ? chosen : "microphone";
    if (available.includes(picked)) {
      await startNative(picked);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audio = new AudioContext();
      const analyser = audio.createAnalyser();
      analyser.fftSize = 512;
      audio.createMediaStreamSource(stream).connect(analyser);
      const samples = new Uint8Array(analyser.fftSize);
      const recorder = new MediaRecorder(
        stream,
        MediaRecorder.isTypeSupported(PREFERRED_TYPE) ? { mimeType: PREFERRED_TYPE } : undefined
      );
      const current: Session = { ...newSession(false, recorder), stream, audio };
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) current.chunks.push(event.data);
      };
      function tick() {
        analyser.getByteTimeDomainData(samples);
        // Fast attack, slow release: syllables rise sharply and fall off
        // smoothly, like a VU meter.
        const target = loudness(samples);
        current.envelope += (target - current.envelope) * (target > current.envelope ? 0.5 : 0.12);
        const now = performance.now();
        if (current.resumedAt !== null && now - current.sampledAt >= SAMPLE_MS) {
          current.sampledAt = now;
          current.waveform = [...current.waveform, current.envelope].slice(-WAVEFORM_LENGTH);
          setWaveform(current.waveform);
        }
        setDurationMs(elapsed(current));
        current.frame = requestAnimationFrame(tick);
      }
      session.current = current;
      recorder.start(1000);
      current.frame = requestAnimationFrame(tick);
      setDurationMs(0);
      setStatus("recording");
    } catch (error_) {
      release();
      setError(microphoneError(error_));
      setStatus("idle");
    }
  }

  function pause() {
    const current = session.current;
    if (typeof current?.resumedAt !== "number") return;
    if (current.native) void desktop.audioRecorder.pause();
    else current.recorder?.pause();
    current.elapsedMs = elapsed(current);
    current.resumedAt = null;
    setStatus("paused");
  }

  function resume() {
    const current = session.current;
    if (current?.resumedAt !== null) return;
    if (current.native) void desktop.audioRecorder.resume();
    else current.recorder?.resume();
    current.resumedAt = performance.now();
    setStatus("recording");
  }

  async function stop(): Promise<RecordedAudio | null> {
    const current = session.current;
    if (!current) return null;
    setStatus("idle");
    setWaveform([]);
    cancelAnimationFrame(current.frame);
    session.current = null;
    if (current.native) {
      const finished = await desktop.audioRecorder.stop();
      return { file: finished.file, mimeType: finished.mimeType, durationMs: finished.durationMs };
    }
    const total = elapsed(current);
    const recorder = current.recorder;
    if (!recorder) return null;
    const audio = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(current.chunks, { type: recorder.mimeType }));
      session.current = current;
      release();
    });
    return storeRecordedAudio(audio, total);
  }

  function discard() {
    release();
    setInUse(null);
    setNotice(null);
    setStatus("idle");
    setWaveform([]);
    setDurationMs(0);
  }

  return {
    status,
    durationMs,
    waveform,
    error,
    sources,
    source,
    setSource,
    echoCancellation,
    microphone: inUse,
    notice,
    useAutomaticMicrophone: () => setMicrophone(AUTOMATIC_MICROPHONE),
    deniedAccess: (Object.keys(accessDenied) as DeniedAccess[]).find(
      (kind) => accessDenied[kind] === error
    ),
    start,
    pause,
    resume,
    stop,
    discard
  };
}
