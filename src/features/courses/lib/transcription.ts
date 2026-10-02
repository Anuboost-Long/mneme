import { desktop, type TranscribeOptions } from "@chain/sdk";

import { errorMessage } from "../../../shared/lib/errorMessage";
import {
  transcriptionModels,
  VAD,
  WHISPER_LANGUAGES,
  type TranscriptionExtension
} from "../../extensions/lib/catalog";
import {
  isReady,
  onlyDownloadedFor,
  refreshExtensions
} from "../../extensions/lib/extensionsState";
import { saveTranscript } from "./recording/actions";
import type { Recording } from "./recording/types";

// Shared by the page's transcript panel (which lets the user choose the
// engine and language) and Home's recorder (which uses the last choice).

export const LOCALE_KEY = "mneme.transcribe.locale";
export const ENGINE_KEY = "mneme.transcribe.engine";
export const SYSTEM = "system";

export function stored(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
}

export function preferredLocale(locales: string[]) {
  const system = navigator.language.toLowerCase();
  return (
    locales.find((locale) => locale === stored(LOCALE_KEY)) ??
    locales.find((locale) => locale.toLowerCase() === system) ??
    locales.find((locale) => locale.toLowerCase().startsWith(system.split("-")[0])) ??
    locales[0]
  );
}

export function transcribeError(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  if (code === "UNSUPPORTED")
    return errorMessage(error, "Transcription isn’t available on this system.");
  if (code === "UNAVAILABLE")
    return "Another recording is being transcribed. Wait for it to finish, then try again.";
  if (code === "PERMISSION_DENIED")
    return "Speech recognition is off. Turn it on in System Settings → Privacy & Security → Speech Recognition, then try again.";
  if (code === "NOT_FOUND")
    return "This recording’s audio file is missing, so it can’t be transcribed.";
  return errorMessage(error, "Couldn’t transcribe this recording. Try again.");
}

export function transcribeOptions(
  model: TranscriptionExtension | undefined,
  locale: string
): TranscribeOptions {
  if (!model) return { locale };
  return {
    locale: locale || undefined,
    engine: {
      modelId: model.manifest.id,
      config: model.config,
      vad: { modelId: VAD.manifest.id, model: VAD.model }
    }
  };
}

// Transcribes with the engine and language the user last picked in a
// transcript panel, or the first available ones, and saves the transcript
// on the recording. Returns its text.
export async function transcribeRecording(
  recording: Recording,
  onProgress: (progress: number) => void
) {
  const [deviceLocales, installed] = await Promise.all([
    desktop.speech.locales().catch(() => [] as string[]),
    refreshExtensions()
  ]);
  const downloaded = transcriptionModels.filter((extension) => isReady(extension, installed));
  const system = onlyDownloadedFor("transcription") && downloaded.length > 0 ? [] : deviceLocales;
  const saved = stored(ENGINE_KEY);
  const model =
    downloaded.find((extension) => extension.manifest.id === saved) ??
    (system.length ? undefined : downloaded[0]);
  if (!model && system.length === 0)
    throw new Error(
      "No transcription engine is set up. Add a speech model in Settings, Extensions."
    );
  const locales = model ? (model.languages ?? ["", ...WHISPER_LANGUAGES]) : system;
  const transcript = await desktop.speech.transcribe(
    recording.file_reference,
    transcribeOptions(model, preferredLocale(locales)),
    onProgress
  );
  return saveTranscript(recording.id, transcript);
}
