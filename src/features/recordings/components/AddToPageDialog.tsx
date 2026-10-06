import { addRecordingToPage } from "@/features/courses/lib/page/actions";
import type { RecordingListItem } from "@/features/courses/lib/recording/types";
import PagePicker, { type PageTarget } from "@/features/home/components/PagePicker";
import { useResetOnOpen } from "@/shared/lib/dialogState";
import { errorMessage } from "@/shared/lib/errorMessage";
import Dialog from "@/shared/ui/Dialog";
import { BodyText } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useState } from "react";

export default function AddToPageDialog({
  open,
  recording,
  onAdded,
  onClose
}: Readonly<{
  open: boolean;
  recording: RecordingListItem;
  onAdded: () => void;
  onClose: () => void;
}>) {
  const [page, setPage] = useState<PageTarget | null>(null);
  const [withTranscript, setWithTranscript] = useState(!!recording.transcript);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useResetOnOpen(open, () => {
    setPage(null);
    setWithTranscript(!!recording.transcript);
    setBusy(false);
    setError("");
  });

  async function add(complete: (callback: () => void) => void) {
    if (!page) {
      setError("Choose the page to add this recording to.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await addRecordingToPage(recording, page.id, withTranscript);
      complete(onAdded);
    } catch (error_) {
      setError(errorMessage(error_, "Couldn’t add the recording to the page. Try again."));
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} title="Add to page" busy={busy} onClose={onClose}>
      {(close, complete) => (
        <div className={clsx("space-y-5")}>
          <BodyText tone="muted" className={clsx("wrap-anywhere")}>
            “{recording.name}” goes at the end of the page you choose, as a player.
          </BodyText>
          <PagePicker selected={page} onSelect={setPage} />
          {recording.transcript && (
            <label className={clsx("flex cursor-pointer items-center gap-3 text-sm")}>
              <input
                type="checkbox"
                checked={withTranscript}
                onChange={(event) => setWithTranscript(event.target.checked)}
                className={clsx("accent-current")}
              />
              <span>Add its transcript underneath</span>
            </label>
          )}
          {error && (
            <BodyText role="alert" tone="error">
              {error}
            </BodyText>
          )}
          <div className={clsx("flex justify-end gap-3 border-t border-ink/10 pt-4")}>
            <button
              type="button"
              disabled={busy}
              onClick={close}
              className={clsx(
                "rounded-md border border-ink/15 px-4 py-2 text-sm",
                "hover:bg-ink/5"
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void add(complete)}
              className={clsx(
                "rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action",
                "hover:bg-action/85"
              )}
            >
              {busy ? "Adding…" : "Add to page"}
            </button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
