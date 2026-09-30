import { useEffect, useRef, useState } from "react";

// AAC in MP4: what WKWebView records by default, and a format the
// model-based transcriber can decode (its decoder has no Opus, which is
// WebView2's default).
const PREFERRED_TYPE = "audio/mp4;codecs=mp4a.40.2";

export type RecorderStatus = "idle" | "starting" | "recording" | "paused";

// About four seconds of loudness history, one sample every 40 ms.
export const WAVEFORM_LENGTH = 96;
const SAMPLE_MS = 40;

type Session = {
  recorder: MediaRecorder;
  stream: MediaStream;
  audio: AudioContext;
  chunks: Blob[];
  elapsedMs: number;
  resumedAt: number | null;
  frame: number;
  envelope: number;
  sampledAt: number;
  waveform: number[];
};

const ACCESS_DENIED = "Microphone access is off for mneme.";

function microphoneError(error: unknown) {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError") return ACCESS_DENIED;
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

function elapsed(session: Session) {
  return (
    session.elapsedMs + (session.resumedAt === null ? 0 : performance.now() - session.resumedAt)
  );
}

// Records through the webview's own getUserMedia + MediaRecorder; Chain
// declares the microphone (package.json → chain.permissions) and the OS
// prompt is the only permission gate. The paused span is left out of both
// the audio and the duration.
export function useAudioRecorder() {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [durationMs, setDurationMs] = useState(0);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const session = useRef<Session | null>(null);

  useEffect(() => () => release(), []);

  function release() {
    const current = session.current;
    if (!current) return;
    session.current = null;
    cancelAnimationFrame(current.frame);
    if (current.recorder.state !== "inactive") current.recorder.stop();
    current.stream.getTracks().forEach((track) => track.stop());
    void current.audio.close();
  }

  async function start() {
    setError(null);
    setStatus("starting");
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
      const current: Session = {
        recorder,
        stream,
        audio,
        chunks: [],
        elapsedMs: 0,
        resumedAt: performance.now(),
        frame: 0,
        envelope: 0,
        sampledAt: performance.now(),
        waveform: []
      };
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
    current.recorder.pause();
    current.elapsedMs = elapsed(current);
    current.resumedAt = null;
    setStatus("paused");
  }

  function resume() {
    const current = session.current;
    if (current?.resumedAt !== null) return;
    current.recorder.resume();
    current.resumedAt = performance.now();
    setStatus("recording");
  }

  function stop(): Promise<{ audio: Blob; durationMs: number } | null> {
    const current = session.current;
    if (!current) return Promise.resolve(null);
    const total = elapsed(current);
    return new Promise((resolve) => {
      current.recorder.onstop = () => {
        resolve({
          audio: new Blob(current.chunks, { type: current.recorder.mimeType }),
          durationMs: total
        });
      };
      release();
      setStatus("idle");
      setWaveform([]);
    });
  }

  function discard() {
    release();
    setStatus("idle");
    setWaveform([]);
    setDurationMs(0);
  }

  return {
    status,
    durationMs,
    waveform,
    error,
    accessDenied: error === ACCESS_DENIED,
    start,
    pause,
    resume,
    stop,
    discard
  };
}
