import { deletePages } from "@/features/courses/lib/page/actions";
import { useResetOnOpen } from "@/shared/lib/dialogState";
import Dialog from "@/shared/ui/Dialog";
import { BodyText } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useState } from "react";

export default function DeletePages({
  open,
  pageIds,
  onClose,
  onDelete
}: Readonly<{
  open: boolean;
  pageIds: number[];
  onClose: () => void;
  onDelete: () => void;
}>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useResetOnOpen(open, () => {
    setBusy(false);
    setError("");
  });
  const count = pageIds.length;
  const noun = `page${count === 1 ? "" : "s"}`;

  async function confirmDelete(complete: (callback: () => void) => void) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await deletePages(pageIds);
      complete(onDelete);
    } catch {
      setError(`Couldn’t delete these ${noun}. Try again.`);
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} title={`Delete ${count} ${noun}?`} busy={busy} onClose={onClose}>
      {(close, complete) => (
        <>
          <BodyText tone="muted" className={clsx("wrap-anywhere")}>
            {count} {noun} {count === 1 ? "moves" : "move"} to Recently deleted. You can restore{" "}
            {count === 1 ? "it" : "them"} from there for 30 days.
          </BodyText>
          {error && (
            <BodyText role="alert" tone="error" className={clsx("mt-4")}>
              {error}
            </BodyText>
          )}
          <div className={clsx("mt-8 flex justify-end gap-3")}>
            <button
              type="button"
              data-autofocus
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
              onClick={() => confirmDelete(complete)}
              className={clsx(
                "rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white",
                "hover:bg-red-800"
              )}
            >
              {busy ? "Deleting…" : `Delete ${count} ${noun}`}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
