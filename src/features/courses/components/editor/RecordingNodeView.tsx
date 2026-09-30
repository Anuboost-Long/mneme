import { desktop } from "@chain/sdk";
import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

import { errorMessage } from "../../../../shared/lib/errorMessage";
import { formatDuration } from "../../../../shared/lib/formatDuration";
import { usePlayback } from "../../../../shared/lib/usePlayback";
import ConfirmDeleteDialog from "../../../../shared/ui/ConfirmDeleteDialog";
import CassetteDeck, { DeckIcon, DeckKey, type ReelMotion } from "../../../../shared/ui/CassetteDeck";
import PlaybackDeck, { PlaybackKeys } from "../../../../shared/ui/PlaybackDeck";
import { Caption } from "../../../../shared/ui/Typography";
import {
  createRecording,
  deleteRecording,
  getRecording,
  renameRecording,
  type Recording
} from "../../lib/recordings";
import { useAudioRecorder, type RecorderStatus } from "../../lib/useAudioRecorder";

import { insertParagraphs } from "./insertParagraphs";
import MicrophoneAccessDialog from "./MicrophoneAccessDialog";
import TranscriptPanel from "./TranscriptPanel";
import Waveform from "./Waveform";

const TAPE_LENGTH_MS = 45 * 60 * 1000;

const statusLabels: Record<RecorderStatus, string> = {
  idle: "Audio recording",
  starting: "Starting…",
  recording: "Recording",
  paused: "Paused"
};

function reelMotion(status: RecorderStatus): ReelMotion {
  if (status === "recording") return "turning";
  return status === "paused" ? "held" : "still";
}

export default function RecordingNodeView({
  node,
  editor,
  getPos,
  extension,
  updateAttributes,
  deleteNode
}: Readonly<ReactNodeViewProps>) {
  const recordingId = node.attrs.recordingId as number | null;

  function insertBelow(text: string) {
    const position = getPos();
    if (position !== undefined) insertParagraphs(editor, text, { from: position + node.nodeSize });
  }

  return (
    <NodeViewWrapper
      contentEditable={false}
      className={clsx("my-3 rounded-lg border border-ink/15 bg-surface px-4 py-3")}
    >
      {recordingId === null ? (
        <Recorder
          pageId={(extension.options as { pageId: number }).pageId}
          startNow={node.attrs.startOnInsert === true}
          onStarted={() => updateAttributes({ startOnInsert: false })}
          onSaved={(id) => updateAttributes({ recordingId: id })}
          onDiscard={deleteNode}
        />
      ) : (
        <Player
          key={recordingId}
          recordingId={recordingId}
          onDeleted={deleteNode}
          onInsertTranscript={insertBelow}
        />
      )}
    </NodeViewWrapper>
  );
}

function Recorder({
  pageId,
  startNow,
  onStarted,
  onSaved,
  onDiscard
}: Readonly<{
  pageId: number;
  startNow: boolean;
  onStarted: () => void;
  onSaved: (id: number) => void;
  onDiscard: () => void;
}>) {
  const recorder = useAudioRecorder();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showingAccessHelp, setShowingAccessHelp] = useState(false);

  useEffect(() => {
    if (!startNow) return;
    onStarted();
    void recorder.start();
  }, [startNow]);

  async function stop() {
    const result = await recorder.stop();
    if (!result) return;
    setSaving(true);
    setSaveError(null);
    try {
      const recording = await createRecording(pageId, result.audio, result.durationMs);
      onSaved(recording.id);
    } catch (error) {
      setSaveError(errorMessage(error, "Couldn’t save this recording. Try again."));
      setSaving(false);
    }
  }

  const error = recorder.error ?? saveError;

  function renderKeys() {
    if (saving)
      return (
        <Caption as="span" tone="muted" role="status" className={clsx("px-1")}>
          Saving…
        </Caption>
      );
    if (recorder.status === "idle" || recorder.status === "starting")
      return (
        <>
          <DeckKey
            label="Start recording"
            disabled={recorder.status === "starting"}
            onClick={() => void recorder.start()}
          >
            <span className={clsx("size-3 rounded-full bg-red-600")} />
          </DeckKey>
          <span className={clsx("flex-1")} />
          <DeckKey label="Remove" tone="danger" onClick={onDiscard}>
            <DeckIcon name="trash" />
          </DeckKey>
        </>
      );
    return (
      <>
        {recorder.status === "recording" ? (
          <DeckKey label="Pause" onClick={recorder.pause}>
            <DeckIcon name="pause" />
          </DeckKey>
        ) : (
          <DeckKey label="Resume" onClick={recorder.resume}>
            <DeckIcon name="play" />
          </DeckKey>
        )}
        <DeckKey label="Stop and save" tone="primary" onClick={() => void stop()}>
          <span className={clsx("size-3 rounded-sm bg-current")} />
        </DeckKey>
        <span className={clsx("flex-1")} />
        <DeckKey label="Discard" tone="quiet" onClick={recorder.discard}>
          <DeckIcon name="close" />
        </DeckKey>
      </>
    );
  }

  return (
    <div>
      <CassetteDeck
        label={statusLabels[recorder.status]}
        recording={recorder.status === "recording"}
        timer={formatDuration(recorder.durationMs)}
        wound={Math.min(1, recorder.durationMs / TAPE_LENGTH_MS)}
        reels={reelMotion(recorder.status)}
        tape={<Waveform values={recorder.waveform} live={recorder.status === "recording"} />}
        controls={renderKeys()}
      />
      {error && (
        <Caption role="alert" tone="error" className={clsx("mt-2")}>
          {error}
          {recorder.accessDenied && (
            <>
              {" "}
              <button
                type="button"
                onClick={() => setShowingAccessHelp(true)}
                className={clsx(
                  "rounded font-medium underline underline-offset-2",
                  "hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
                )}
              >
                Show how to turn it on
              </button>
            </>
          )}
        </Caption>
      )}
      {showingAccessHelp && (
        <MicrophoneAccessDialog
          onRetry={() => {
            setShowingAccessHelp(false);
            void recorder.start();
          }}
          onClose={() => setShowingAccessHelp(false)}
        />
      )}
    </div>
  );
}

function Player({
  recordingId,
  onDeleted,
  onInsertTranscript
}: Readonly<{
  recordingId: number;
  onDeleted: () => void;
  onInsertTranscript: (text: string) => void;
}>) {
  const [recording, setRecording] = useState<Recording | null | undefined>(undefined);
  const [src, setSrc] = useState<string>();
  const [mode, setMode] = useState<"view" | "rename" | "delete">("view");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const playback = usePlayback(src, recording?.duration_ms ?? 0, setError);

  useEffect(() => {
    if (mode === "rename") nameInput.current?.select();
  }, [mode]);

  useEffect(() => {
    let active = true;
    getRecording(recordingId)
      .then(async (row) => {
        const url = row ? await desktop.files.url(row.file_reference) : undefined;
        if (!active) return;
        setRecording(row ?? null);
        setSrc(url);
      })
      .catch(() => active && setRecording(null));
    return () => {
      active = false;
    };
  }, [recordingId]);

  if (recording === undefined)
    return (
      <Caption tone="muted" role="status">
        Loading recording…
      </Caption>
    );
  if (recording === null)
    return (
      <div className={clsx("flex items-center gap-2")}>
        <Caption as="span" tone="muted" className={clsx("flex-1")}>
          This recording is no longer available.
        </Caption>
        <button
          type="button"
          onClick={onDeleted}
          className={clsx(
            "h-8 shrink-0 rounded-md px-3 text-sm",
            "text-muted",
            "hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
          )}
        >
          Remove
        </button>
      </div>
    );

  function rename() {
    setError(null);
    renameRecording(recordingId, name)
      .then(() => {
        setRecording((current) => current && { ...current, name: name.trim() });
        setMode("view");
      })
      .catch((error_) =>
        setError(errorMessage(error_, "Couldn’t rename this recording. Try again."))
      );
  }

  const { name: savedName } = recording;

  function renderKeys() {
    if (mode === "rename")
      return (
        <>
          <span className={clsx("flex-1")} />
          <DeckKey label="Cancel" tone="quiet" onClick={() => setMode("view")}>
            <DeckIcon name="close" />
          </DeckKey>
          <DeckKey label="Save name" tone="primary" onClick={rename}>
            <DeckIcon name="check" />
          </DeckKey>
        </>
      );
    return (
      <>
        <PlaybackKeys playback={playback} />
        <span className={clsx("flex-1")} />
        <DeckKey
          label="Rename"
          tone="quiet"
          onClick={() => {
            setName(savedName);
            setMode("rename");
          }}
        >
          <DeckIcon name="rename" />
        </DeckKey>
        <DeckKey label="Delete" tone="danger" onClick={() => setMode("delete")}>
          <DeckIcon name="trash" />
        </DeckKey>
      </>
    );
  }

  return (
    <div>
      <PlaybackDeck
        label={
          mode === "rename" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                rename();
              }}
            >
              <input
                ref={nameInput}
                aria-label="Recording name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => event.key === "Escape" && setMode("view")}
                className={clsx(
                  "w-64 max-w-full rounded-sm bg-transparent",
                  "border-b border-chain-navy/40",
                  "focus-visible:outline-none focus-visible:border-chain-navy"
                )}
              />
            </form>
          ) : (
            savedName
          )
        }
        playback={playback}
        controls={renderKeys()}
      />
      {mode === "delete" && (
        <ConfirmDeleteDialog
          title="Delete recording?"
          message={`“${savedName}” and its transcript will be permanently deleted. This can’t be undone.`}
          confirmLabel="Delete recording"
          failure="Couldn’t delete this recording. Try again."
          onConfirm={() => deleteRecording(recordingId)}
          onClose={() => setMode("view")}
          onDeleted={onDeleted}
        />
      )}
      <TranscriptPanel
        recording={recording}
        onChange={(transcript) => setRecording((current) => current && { ...current, transcript })}
        onInsert={onInsertTranscript}
      />
      {error && (
        <Caption role="alert" tone="error" className={clsx("mt-2")}>
          {error}
        </Caption>
      )}
    </div>
  );
}
