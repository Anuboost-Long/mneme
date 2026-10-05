import clsx from "clsx";
import { useState } from "react";
import { Link } from "react-router-dom";

import { errorMessage } from "../../../shared/lib/errorMessage";
import { useFileUrl } from "../../../shared/lib/useFileUrl";
import { usePlayback } from "../../../shared/lib/usePlayback";
import PlaybackDeck, { PlaybackKeys } from "../../../shared/ui/PlaybackDeck";
import { BodyText, Caption } from "../../../shared/ui/Typography";
import { appendToPage } from "../../courses/lib/page/actions";
import { transcriptHtml, type RecordingListItem } from "../../courses/lib/recording/types";
import { transcribeError, transcribeRecording } from "../../courses/lib/transcription";
import AddToPageDialog from "./AddToPageDialog";

const button = clsx(
  "h-8 rounded-md px-3 text-sm",
  "border border-ink/15 bg-surface",
  "hover:bg-ink/5 focus-visible:outline-1 focus-visible:outline-ink"
);

export const recordingPageLink = (recording: RecordingListItem) =>
  `/courses/${recording.course_id}/modules/${recording.module_id}/pages/${recording.page_id}`;

// The open recording: the same deck as a page's recording block, its
// transcript, and what can be done with it from here.
export default function RecordingDetails({
  recording,
  onTranscribed,
  onPlaced
}: Readonly<{
  recording: RecordingListItem;
  onTranscribed: (transcript: string) => void;
  onPlaced: () => void;
}>) {
  const src = useFileUrl(recording.file_reference);
  const [error, setError] = useState<string | null>(null);
  const playback = usePlayback(src, recording.duration_ms, setError);
  const [progress, setProgress] = useState<number | null>(null);
  const [added, setAdded] = useState(false);
  const [silent, setSilent] = useState(false);
  const [placing, setPlacing] = useState(false);

  async function transcribe() {
    setError(null);
    setAdded(false);
    setSilent(false);
    setProgress(0);
    try {
      const transcript = await transcribeRecording(recording, setProgress);
      setSilent(!transcript.trim());
      onTranscribed(transcript);
    } catch (error_) {
      if ((error_ as { code?: string } | null)?.code !== "CANCELLED")
        setError(transcribeError(error_));
    } finally {
      setProgress(null);
    }
  }

  async function addTranscriptToPage() {
    if (recording.page_id === null) return;
    try {
      await appendToPage(recording.page_id, transcriptHtml(recording.transcript ?? ""));
      setAdded(true);
    } catch (error_) {
      setError(errorMessage(error_, "Couldn’t add the transcript to the page. Try again."));
    }
  }

  function renderTranscript() {
    if (progress !== null) {
      return (
        <div className={clsx("space-y-2")} aria-live="polite">
          <BodyText>Transcribing… {Math.round(progress * 100)}%</BodyText>
          <progress
            value={progress}
            max={1}
            aria-label="Transcription progress"
            className={clsx(
              "block h-1 w-full appearance-none overflow-hidden rounded-full bg-ink/10",
              "[&::-webkit-progress-bar]:bg-ink/10 [&::-webkit-progress-value]:bg-ink/60"
            )}
          />
        </div>
      );
    }
    if (recording.transcript) {
      return (
        <p
          className={clsx(
            "max-h-48 overflow-y-auto rounded-md p-3",
            "bg-ink/4",
            "text-sm leading-6 whitespace-pre-line"
          )}
        >
          {recording.transcript}
        </p>
      );
    }
    if (silent)
      return (
        <Caption tone="muted">
          No speech was found in this recording, so there’s no transcript.
        </Caption>
      );
    return <Caption tone="muted">No transcript yet. Transcription runs on this computer.</Caption>;
  }

  return (
    <div className={clsx("space-y-4 px-3 pt-1 pb-4")}>
      <audio {...playback.audioProps}>
        <track kind="captions" />
      </audio>
      <PlaybackDeck
        label={recording.name}
        playback={playback}
        controls={<PlaybackKeys playback={playback} />}
      />

      <section aria-label="Transcript" className={clsx("space-y-2")}>
        {renderTranscript()}
      </section>

      {error && (
        <BodyText role="alert" tone="error">
          {error}
        </BodyText>
      )}
      {added && (
        <Caption tone="muted">Transcript added to the end of “{recording.page_title}”.</Caption>
      )}

      <div className={clsx("flex flex-wrap items-center gap-2")}>
        <button
          type="button"
          disabled={progress !== null}
          onClick={() => void transcribe()}
          className={button}
        >
          {recording.transcript ? "Transcribe again" : "Transcribe"}
        </button>
        {recording.page_id === null ? (
          <button
            type="button"
            disabled={progress !== null}
            onClick={() => setPlacing(true)}
            className={button}
          >
            Add to page…
          </button>
        ) : (
          <>
            {recording.transcript && (
              <button
                type="button"
                disabled={progress !== null || added}
                onClick={() => void addTranscriptToPage()}
                className={button}
              >
                Add transcript to page
              </button>
            )}
            <Link
              to={recordingPageLink(recording)}
              className={clsx(button, "inline-flex items-center")}
            >
              Open page
            </Link>
          </>
        )}
      </div>

      <AddToPageDialog
        open={placing}
        recording={recording}
        onAdded={() => {
          setPlacing(false);
          onPlaced();
        }}
        onClose={() => setPlacing(false)}
      />
    </div>
  );
}
