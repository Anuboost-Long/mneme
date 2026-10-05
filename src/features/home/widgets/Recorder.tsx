import clsx from "clsx";
import { useState } from "react";

import { useLastValue } from "../../../shared/lib/dialogState";
import { formatDuration } from "../../../shared/lib/formatDuration";
import { Caption } from "../../../shared/ui/Typography";
import MicrophoneAccessDialog from "../../courses/components/editor/MicrophoneAccessDialog";
import MicrophoneNotice from "../../courses/components/editor/MicrophoneNotice";
import RecordingSourcePicker from "../../courses/components/editor/RecordingSourcePicker";
import Waveform from "../../courses/components/editor/Waveform";
import { discardRecordedAudio } from "../../courses/lib/recording/actions";
import { useAudioRecorder } from "../../courses/lib/useAudioRecorder";
import SoundSettingsButton from "../../recordings/components/SoundSettingsButton";
import FileRecordingDialog, { type Take } from "../components/FileRecordingDialog";
import { getPendingTake, setPendingTake } from "../lib/pendingTake";
import { RecordingsList } from "./study";
import type { WidgetProps } from "./types";

const control = clsx("grid size-9 shrink-0 place-items-center rounded-full", "border border-ink/20 bg-surface", "hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink");

// Record from Home, then file the take on a page or in Recordings, optionally transcribed.
// A take that isn't filed yet stays (see pendingTake) until it is, or is
// discarded.
export function RecorderWidget({ widget }: Readonly<WidgetProps>) {
  const recorder = useAudioRecorder();
  const [take, setTakeState] = useState<Take | null>(getPendingTake);
  const setTake = (next: Take | null) => {
    setPendingTake(next);
    setTakeState(next);
  };
  const [filing, setFiling] = useState<Take | null>(null);
  const filingTake = useLastValue(filing);
  const [filedCount, setFiledCount] = useState(0);
  const [accessHelp, setAccessHelp] = useState(false);
  const live = recorder.status === "recording" || recorder.status === "paused" || recorder.status === "starting";
  const roomy = widget.size !== "small";

  async function start() {
    await recorder.start();
  }

  async function stop() {
    const stopped = await recorder.stop();
    if (!stopped) return;
    setTake(stopped);
    setFiling(stopped);
  }

  function renderControls() {
    if (take) {
      return (
        <div className={clsx("flex w-full items-center gap-3", !roomy && "flex-col items-stretch gap-2")}>
          <div className={clsx("min-w-0 flex-1")}>
            <p className={clsx("text-sm font-medium tabular-nums")}>{formatDuration(take.durationMs)} recorded</p>
            <Caption tone="muted">Not saved yet</Caption>
          </div>
          <div className={clsx("flex gap-2")}>
            <button
              type="button"
              onClick={() => {
                void discardRecordedAudio(take).catch(() => undefined);
                setTake(null);
              }}
              className={clsx("h-8 rounded-md px-3 text-sm text-muted", "hover:bg-ink/5 hover:text-ink")}>Discard</button>
            <button type="button" onClick={() => setFiling(take)} className={clsx("h-8 flex-1 rounded-md", "bg-action text-on-action", "px-3 text-sm font-medium", "hover:bg-action/85")}>Save…</button>
          </div>
        </div>
      );
    }
    if (live) {
      const paused = recorder.status === "paused";
      return (
        <div className={clsx("flex w-full items-center gap-3")}>
          <span aria-hidden="true" className={clsx("size-2.5 shrink-0 rounded-full bg-danger", !paused && "animate-pulse")} />
          <span className={clsx("text-lg font-semibold tabular-nums")} aria-live="off">{formatDuration(recorder.durationMs)}</span>
          {roomy ? (
            <div className={clsx("h-8 min-w-0 flex-1")}>
              <Waveform values={recorder.waveform} live={!paused} />
            </div>
          ) : (
            <span className={clsx("flex-1")} />
          )}
          <button type="button" onClick={paused ? recorder.resume : recorder.pause} disabled={recorder.status === "starting"} aria-label={paused ? "Resume recording" : "Pause recording"} className={control}>
            {paused ? (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M5 3.5v9l7-4.5-7-4.5Z" /></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="4" y="3" width="3" height="10" rx="1" /><rect x="9" y="3" width="3" height="10" rx="1" /></svg>
            )}
          </button>
          <button type="button" onClick={() => void stop()} disabled={recorder.status === "starting"} aria-label="Stop and save" className={control}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" aria-hidden="true"><rect x="1" y="1" width="10" height="10" rx="2" /></svg>
          </button>
        </div>
      );
    }
    return (
      <div className={clsx("flex w-full items-center gap-3", !roomy && "flex-col items-start")}>
        <button
          type="button"
          onClick={() => void start()}
          aria-label="Start recording"
          className={clsx("grid size-11 shrink-0 place-items-center rounded-full", "border-2 border-ink/20 bg-surface", "hover:border-ink/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink")}
        >
          <span aria-hidden="true" className={clsx("size-5 rounded-full bg-danger")} />
        </button>
        <div className={clsx("min-w-0")}>
          <p className={clsx("text-sm font-medium")}>Record</p>
          <Caption tone="muted" className={clsx(!roomy && "hidden")}>A lecture or a thought. Save it to a page or just to Recordings, transcribed if you like.</Caption>
          <div className={clsx("mt-2 flex items-start gap-1")}><RecordingSourcePicker sources={recorder.sources} source={recorder.source} echoCancellation={recorder.echoCancellation} onChange={recorder.setSource} className={clsx("w-48 max-w-full")} /><SoundSettingsButton /></div>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("flex h-full flex-col")}>
      <div className={clsx("flex px-3 pb-3", widget.size === "large" ? "border-b border-ink/10" : "flex-1 items-end")}>{renderControls()}</div>
      <MicrophoneNotice microphone={live ? recorder.microphone : null} notice={recorder.notice} onUseAutomatic={recorder.useAutomaticMicrophone} className={clsx("px-3 pb-2")} />
      {recorder.error && !recorder.deniedAccess && <Caption tone="error" className={clsx("px-3 pb-2")}>{recorder.error}</Caption>}
      {recorder.deniedAccess && (
        <button type="button" onClick={() => setAccessHelp(true)} className={clsx("px-3 pb-2 text-left text-xs text-danger underline underline-offset-2")}>
          {recorder.deniedAccess === "system" ? "Computer audio recording is off." : "Microphone access is off."} How to turn it on
        </button>
      )}
      {widget.size === "large" && <RecordingsList limit={5} refreshKey={filedCount} />}
      <FileRecordingDialog
        open={filing !== null}
        take={filingTake}
        onFiled={() => {
          setTake(null);
          setFiledCount((count) => count + 1);
        }}
        onClose={() => setFiling(null)}
      />
      <MicrophoneAccessDialog
        open={accessHelp}
        access={recorder.deniedAccess}
        onRetry={() => {
          setAccessHelp(false);
          void start();
        }}
        onClose={() => setAccessHelp(false)}
      />
    </div>
  );
}
