import { desktop } from "@chain/sdk";
import clsx from "clsx";
import { useEffect, useState } from "react";

import { usePlayback } from "../../../shared/lib/usePlayback";
import { DeckIcon, DeckKey } from "../../../shared/ui/CassetteDeck";
import ConfirmDeleteDialog from "../../../shared/ui/ConfirmDeleteDialog";
import PlaybackDeck, { PlaybackKeys } from "../../../shared/ui/PlaybackDeck";
import { Caption } from "../../../shared/ui/Typography";
import { keepInView, paintHighlight } from "../../read-aloud/lib/highlight";
import { textRange, type ReadableChunk } from "../../read-aloud/lib/readableText";
import { deletePageAudio, isOutdated, type PageAudio } from "../lib/pageAudio";

export default function AudiobookBar({
  audio,
  chunks,
  onRecreate,
  onDeleted,
  onClose
}: Readonly<{
  audio: PageAudio;
  chunks: () => ReadableChunk[];
  onRecreate: () => void;
  onDeleted: () => void;
  onClose: () => void;
}>) {
  const [src, setSrc] = useState<string>();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pageChunks] = useState(chunks);
  const outdated = isOutdated(audio, pageChunks);
  const playback = usePlayback(src, audio.duration_ms, setError);
  const seconds = playback.positionMs / 1000;
  const sentence = outdated
    ? undefined
    : audio.sentences.find((item) => seconds >= item.from && seconds < item.to);

  useEffect(() => {
    let active = true;
    desktop.files
      .url(audio.file_reference)
      .then((url) => active && setSrc(url))
      .catch(() => active && setError("This page’s audio file is missing. Download it again."));
    return () => {
      active = false;
    };
  }, [audio.file_reference]);

  useEffect(() => {
    const within = sentence && pageChunks[sentence.chunk]?.range;
    const range = within && textRange(within, sentence.start, sentence.end);
    paintHighlight("audiobook", range || null);
    if (range) keepInView(range);
    return () => paintHighlight("audiobook", null);
  }, [sentence, pageChunks]);

  return (
    <section
      aria-label="Page audio"
      className={clsx("fixed inset-x-4 bottom-6 z-40 mx-auto max-w-xl")}
    >
      {(outdated || error) && (
        <div
          className={clsx(
            "mb-2 flex items-center gap-3 rounded-lg border border-ink/15 bg-surface px-3 py-2 shadow-md"
          )}
        >
          <Caption role={error ? "alert" : undefined} tone={error ? "error" : "muted"} className={clsx("flex-1")}>
            {error ?? "This page has changed since its audio was made, so sentences aren’t highlighted."}
          </Caption>
          <button
            type="button"
            onClick={onRecreate}
            className={clsx(
              "h-8 shrink-0 rounded-md border border-ink/15 px-3 text-sm",
              "hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-ink"
            )}
          >
            Download again
          </button>
        </div>
      )}
      <div className={clsx("rounded-lg bg-surface shadow-md")}>
        <PlaybackDeck
          label={`Page audio · ${audio.voice_name}`}
          playback={playback}
          controls={
            <>
              <PlaybackKeys playback={playback} />
              <span className={clsx("flex-1")} />
              <DeckKey label="Delete audio" tone="danger" onClick={() => setDeleting(true)}>
                <DeckIcon name="trash" />
              </DeckKey>
              <DeckKey label="Close" tone="quiet" onClick={onClose}>
                <DeckIcon name="close" />
              </DeckKey>
            </>
          }
        />
      </div>
      {deleting && (
        <ConfirmDeleteDialog
          title="Delete page audio?"
          message="The audio file for this page will be deleted from this device. You can download it again any time."
          confirmLabel="Delete audio"
          failure="Couldn’t delete the audio. Try again."
          onConfirm={() => deletePageAudio(audio.page_id)}
          onClose={() => setDeleting(false)}
          onDeleted={onDeleted}
        />
      )}
    </section>
  );
}
