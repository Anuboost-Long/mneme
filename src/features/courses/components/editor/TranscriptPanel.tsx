import { desktop } from "@chain/sdk";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { errorMessage } from "../../../../shared/lib/errorMessage";
import { languageName } from "../../../../shared/lib/languageName";
import Select from "../../../../shared/ui/Select";
import { Caption } from "../../../../shared/ui/Typography";
import { transcriptionModels, WHISPER_LANGUAGES } from "../../../extensions/lib/catalog";
import { isReady, refreshExtensions, useExtensions } from "../../../extensions/lib/extensionsState";
import { saveTranscript, updateTranscriptText } from "../../lib/recording/actions";
import type { Recording } from "../../lib/recording/types";
import {
  ENGINE_KEY,
  LOCALE_KEY,
  preferredLocale,
  remember,
  stored,
  SYSTEM,
  transcribeError,
  transcribeOptions
} from "../../lib/transcription";

const button = clsx(
  "h-8 shrink-0 rounded-md px-3 text-sm font-medium",
  "border border-ink/15",
  "hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-ink"
);
const quietButton = clsx(
  "h-8 shrink-0 rounded-md px-3 text-sm",
  "text-muted",
  "hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
);

// On-device transcription (desktop.speech): the audio never leaves the
// machine. The transcript is saved on the recording, edited here, then
// inserted into the page — where the editor's AI actions clean it up or
// summarize it.
export default function TranscriptPanel({
  recording,
  onChange,
  onInsert
}: Readonly<{
  recording: Recording;
  onChange: (transcript: string) => void;
  onInsert: (transcript: string) => void;
}>) {
  const [stage, setStage] = useState<"idle" | "choosing" | "running">("idle");
  const [systemLocales, setSystemLocales] = useState<string[]>([]);
  const [engine, setEngine] = useState(SYSTEM);
  const [locale, setLocale] = useState("");
  const { installed, onlyDownloaded } = useExtensions();
  const models = transcriptionModels.filter((extension) => isReady(extension, installed));
  const model = models.find((extension) => extension.manifest.id === engine);
  const [progress, setProgress] = useState(0);
  const [draft, setDraft] = useState(recording.transcript ?? "");
  const [error, setError] = useState<string | null>(null);
  const [noEngine, setNoEngine] = useState(false);
  const running = useRef(false);

  useEffect(
    () => () => {
      if (running.current) void desktop.speech.cancel();
    },
    []
  );

  function localesFor(engineId: string, system: string[]) {
    if (engineId === SYSTEM) return system;
    const languages = transcriptionModels.find(
      (extension) => extension.manifest.id === engineId
    )?.languages;
    return languages ?? ["", ...WHISPER_LANGUAGES];
  }

  function chooseEngine(engineId: string, system = systemLocales) {
    setEngine(engineId);
    setLocale(preferredLocale(localesFor(engineId, system)));
  }

  // The built-in engine and any downloaded models; Windows has only the
  // latter (its system engine rejects UNSUPPORTED).
  async function choose() {
    setError(null);
    setNoEngine(false);
    const [deviceLocales, fresh] = await Promise.all([
      desktop.speech.locales().catch(() => [] as string[]),
      refreshExtensions()
    ]);
    const downloaded = transcriptionModels
      .filter((extension) => isReady(extension, fresh))
      .map((extension) => extension.manifest.id);
    const system = onlyDownloaded.transcription && downloaded.length > 0 ? [] : deviceLocales;
    setSystemLocales(system);
    const available = [...(system.length ? [SYSTEM] : []), ...downloaded];
    if (available.length === 0) {
      setNoEngine(true);
      return;
    }
    const saved = stored(ENGINE_KEY);
    chooseEngine(available.find((id) => id === saved) ?? available[0], system);
    setStage("choosing");
  }

  async function transcribe() {
    setError(null);
    setProgress(0);
    setStage("running");
    running.current = true;
    remember(ENGINE_KEY, engine);
    if (locale) remember(LOCALE_KEY, locale);
    const options = transcribeOptions(model, locale);
    try {
      const transcript = await desktop.speech.transcribe(
        recording.file_reference,
        options,
        setProgress
      );
      const text = await saveTranscript(recording.id, transcript);
      setDraft(text);
      onChange(text);
      setStage("idle");
    } catch (error_) {
      setStage("idle");
      if ((error_ as { code?: string } | null)?.code !== "CANCELLED")
        setError(transcribeError(error_));
    } finally {
      running.current = false;
    }
  }

  function saveDraft() {
    setError(null);
    updateTranscriptText(recording.id, draft)
      .then(() => onChange(draft))
      .catch((error_) =>
        setError(errorMessage(error_, "Couldn’t save the transcript. Try again."))
      );
  }

  const transcript = recording.transcript;
  const hasText = transcript !== null && transcript.trim() !== "";

  return (
    <div className={clsx("mt-3 border-t border-ink/10 pt-3")}>
      {stage === "running" && (
        <div className={clsx("flex items-center gap-3")}>
          <progress
            value={progress}
            max={1}
            aria-label="Transcription progress"
            className={clsx(
              "h-1.5 min-w-0 flex-1 overflow-hidden rounded-full",
              "[&::-webkit-progress-bar]:bg-ink/10 [&::-webkit-progress-value]:bg-ink/60"
            )}
          />
          <Caption as="span" tone="muted" className={clsx("tabular-nums")}>
            Transcribing… {Math.round(progress * 100)}%
          </Caption>
          <button
            type="button"
            onClick={() => void desktop.speech.cancel()}
            className={quietButton}
          >
            Cancel
          </button>
        </div>
      )}
      {stage === "choosing" && (
        <div className={clsx("flex flex-wrap items-end gap-2")}>
          {models.length > 0 && (
            <div className={clsx("min-w-48 flex-1")}>
              <Select
                label="Engine"
                value={engine}
                onChange={(next) => chooseEngine(next)}
                options={[
                  ...(systemLocales.length
                    ? [{ value: SYSTEM, label: "Built into this device" }]
                    : []),
                  ...models.map((extension) => ({
                    value: extension.manifest.id,
                    label: extension.name
                  }))
                ]}
              />
            </div>
          )}
          <div className={clsx("min-w-48 flex-1")}>
            <Select
              label="Spoken language"
              value={locale}
              onChange={setLocale}
              options={localesFor(engine, systemLocales).map((tag) => ({
                value: tag,
                label: tag ? languageName(tag) : "Detect automatically"
              }))}
            />
          </div>
          <button
            type="button"
            onClick={() => void transcribe()}
            className={clsx(
              button,
              "h-11 bg-action text-on-action border-transparent hover:bg-action/85"
            )}
          >
            Start transcribing
          </button>
          <button
            type="button"
            onClick={() => setStage("idle")}
            className={clsx(quietButton, "h-11")}
          >
            Cancel
          </button>
        </div>
      )}
      {stage === "idle" && transcript === null && (
        <div className={clsx("flex items-center gap-2")}>
          <Caption as="span" tone="muted" className={clsx("flex-1")}>
            Turn this recording into text, on this Mac.
          </Caption>
          <button type="button" onClick={() => void choose()} className={button}>
            Transcribe
          </button>
        </div>
      )}
      {stage === "idle" && transcript !== null && !hasText && (
        <div className={clsx("flex items-center gap-2")}>
          <Caption as="span" tone="muted" className={clsx("flex-1")}>
            No speech was found in this recording.
          </Caption>
          <button type="button" onClick={() => void choose()} className={quietButton}>
            Try another language
          </button>
        </div>
      )}
      {stage === "idle" && hasText && (
        <details>
          <summary className={clsx("cursor-pointer text-sm font-medium")}>Transcript</summary>
          <label htmlFor={`transcript-${recording.id}`} className={clsx("sr-only")}>
            Transcript
          </label>
          <textarea
            id={`transcript-${recording.id}`}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={8}
            className={clsx(
              "mt-2 block w-full resize-y rounded-md",
              "border border-ink/20 bg-surface",
              "px-3 py-2 text-sm leading-6",
              "focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink"
            )}
          />
          <div className={clsx("mt-2 flex flex-wrap items-center gap-2")}>
            <button type="button" onClick={() => onInsert(draft)} className={button}>
              Insert into page
            </button>
            {draft !== transcript && (
              <button type="button" onClick={saveDraft} className={button}>
                Save changes
              </button>
            )}
            <button type="button" onClick={() => void choose()} className={quietButton}>
              Transcribe again
            </button>
          </div>
          <Caption tone="muted" className={clsx("mt-2")}>
            The inserted text is selected. Run “Clean transcript” or “Summarize” from AI actions to
            tidy it up.
          </Caption>
        </details>
      )}
      {noEngine && (
        <Caption role="alert" tone="error" className={clsx("mt-2")}>
          This device has no built-in transcription. Download a model in{" "}
          <Link to="/settings/extensions" className={clsx("underline underline-offset-2")}>
            Settings → Extensions
          </Link>
          , then try again.
        </Caption>
      )}
      {error && (
        <Caption role="alert" tone="error" className={clsx("mt-2")}>
          {error}
        </Caption>
      )}
    </div>
  );
}
