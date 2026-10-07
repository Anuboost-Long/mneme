import MicrophoneAccessDialog from "@/features/courses/components/editor/MicrophoneAccessDialog";
import MicrophoneNotice from "@/features/courses/components/editor/MicrophoneNotice";
import RecordingSourcePicker from "@/features/courses/components/editor/RecordingSourcePicker";
import Waveform from "@/features/courses/components/editor/Waveform";
import { discardRecordedAudio } from "@/features/courses/lib/recording/actions";
import { recordingSourceLabels, useAudioRecorder } from "@/features/courses/lib/useAudioRecorder";
import FileRecordingDialog, { type Take } from "@/features/home/components/FileRecordingDialog";
import { getPendingTake, setPendingTake } from "@/features/home/lib/pendingTake";
import { useLastValue } from "@/shared/lib/dialogState";
import { formatDuration } from "@/shared/lib/formatDuration";
import { BodyText, Caption } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useState } from "react";

import SoundSettingsButton from "./SoundSettingsButton";

const roundControl = clsx(
  "grid size-9 shrink-0 place-items-center rounded-full",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
  "disabled:opacity-50"
);

const textButton = clsx(
  "h-9 rounded-md px-3 text-sm text-muted",
  "hover:bg-ink/5 hover:text-ink focus-visible:outline-1 focus-visible:outline-ink"
);

export default function RecordingBar({ onSaved }: Readonly<{ onSaved: () => void }>) {
  const recorder = useAudioRecorder();
  const [take, setTake] = useState<Take | null>(getPendingTake);
  const [saving, setSaving] = useState<Take | null>(null);
  const savingTake = useLastValue(saving);
  const [accessHelp, setAccessHelp] = useState(false);
  const live =
    recorder.status === "recording" ||
    recorder.status === "paused" ||
    recorder.status === "starting";
  const paused = recorder.status === "paused";

  function keepTake(next: Take | null) {
    setPendingTake(next);
    setTake(next);
  }

  async function stop() {
    const stopped = await recorder.stop();
    if (!stopped) return;
    keepTake(stopped);
    setSaving(stopped);
  }

  function discardTake() {
    if (take) void discardRecordedAudio(take).catch(() => undefined);
    keepTake(null);
  }

  function renderLive() {
    return (
      <div className={clsx("flex items-center gap-3")}>
        <span
          aria-hidden="true"
          className={clsx(
            "size-2.5 shrink-0 rounded-full bg-danger",
            !paused && "animate-pulse motion-reduce:animate-none"
          )}
        />
        <span className={clsx("text-lg font-semibold tabular-nums")}>
          {formatDuration(recorder.durationMs)}
        </span>
        {recorder.sources.length > 1 && (
          <Caption as="span" tone="muted" className={clsx("hidden shrink-0 sm:inline")}>
            {paused ? "Paused" : recordingSourceLabels[recorder.source]}
          </Caption>
        )}
        <div className={clsx("h-9 min-w-0 flex-1")}>
          <Waveform values={recorder.waveform} live={!paused} />
        </div>
        <button
          type="button"
          onClick={recorder.discard}
          disabled={recorder.status === "starting"}
          className={clsx(textButton, "hidden sm:block")}
        >
          Discard
        </button>
        <button
          type="button"
          onClick={paused ? recorder.resume : recorder.pause}
          disabled={recorder.status === "starting"}
          aria-label={paused ? "Resume recording" : "Pause recording"}
          className={clsx(roundControl, "border border-ink/20 bg-surface", "hover:bg-ink/5")}
        >
          {paused ? (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M5 3.5v9l7-4.5-7-4.5Z" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <rect x="4" y="3" width="3" height="10" rx="1" />
              <rect x="9" y="3" width="3" height="10" rx="1" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={() => void stop()}
          disabled={recorder.status === "starting"}
          aria-label="Stop and save"
          className={clsx(roundControl, "bg-action text-on-action", "hover:bg-action/85")}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true">
            <rect x="1" y="1" width="10" height="10" rx="2" />
          </svg>
        </button>
      </div>
    );
  }

  function renderTake(current: Take) {
    return (
      <div className={clsx("flex flex-wrap items-center gap-x-3 gap-y-2")}>
        <div className={clsx("min-w-0 flex-1")}>
          <p className={clsx("text-sm font-medium tabular-nums")}>
            {formatDuration(current.durationMs)} recorded
          </p>
          <Caption tone="muted">Not saved yet</Caption>
        </div>
        <button type="button" onClick={discardTake} className={textButton}>
          Discard
        </button>
        <button
          type="button"
          onClick={() => setSaving(current)}
          className={clsx(
            "h-9 rounded-md bg-action px-4 text-sm font-medium text-on-action",
            "hover:bg-action/85"
          )}
        >
          Save…
        </button>
      </div>
    );
  }

  function renderIdle() {
    return (
      <div className={clsx("flex flex-wrap items-center gap-x-4 gap-y-3")}>
        <button
          type="button"
          onClick={() => void recorder.start()}
          aria-label="Start recording"
          className={clsx(
            "grid size-11 shrink-0 place-items-center rounded-full",
            "border-2 border-ink/20 bg-surface",
            "hover:border-ink/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          )}
        >
          <span aria-hidden="true" className={clsx("size-4 rounded-full bg-danger")} />
        </button>
        <div className={clsx("min-w-0 flex-1")}>
          <p className={clsx("text-sm font-medium")}>New recording</p>
          <Caption tone="muted">Saved here. Add it to a page whenever you like.</Caption>
        </div>
        <RecordingSourcePicker
          sources={recorder.sources}
          source={recorder.source}
          echoCancellation={recorder.echoCancellation}
          onChange={recorder.setSource}
          className={clsx("w-56 max-w-full")}
        />
        <SoundSettingsButton />
      </div>
    );
  }

  function renderBody() {
    if (live) return renderLive();
    if (take) return renderTake(take);
    return renderIdle();
  }

  return (
    <section
      aria-label="New recording"
      className={clsx("mt-5 rounded-lg border border-ink/10 px-3 py-3 sm:px-4")}
    >
      {renderBody()}
      <MicrophoneNotice
        microphone={live ? recorder.microphone : null}
        notice={recorder.notice}
        onUseAutomatic={recorder.useAutomaticMicrophone}
        className={clsx("mt-2")}
      />
      {recorder.error && (
        <BodyText role="alert" tone="error" className={clsx("mt-2 text-sm")}>
          {recorder.error}{" "}
          {recorder.deniedAccess && (
            <button
              type="button"
              onClick={() => setAccessHelp(true)}
              className={clsx(
                "rounded font-medium underline underline-offset-2",
                "hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
              )}
            >
              Show how to turn it on
            </button>
          )}
        </BodyText>
      )}
      <FileRecordingDialog
        open={saving !== null}
        take={savingTake}
        initialDestination="recordings"
        onFiled={() => {
          keepTake(null);
          onSaved();
        }}
        onClose={() => setSaving(null)}
      />
      <MicrophoneAccessDialog
        open={accessHelp}
        access={recorder.deniedAccess}
        onRetry={() => {
          setAccessHelp(false);
          void recorder.start();
        }}
        onClose={() => setAccessHelp(false)}
      />
    </section>
  );
}
