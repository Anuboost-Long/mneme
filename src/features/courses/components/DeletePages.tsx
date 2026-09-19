import { useState } from "react";
import clsx from "clsx";
import { deletePages } from "../lib/pages";
import Dialog from "../../../shared/ui/Dialog";
import { BodyText } from "../../../shared/ui/Typography";

export default function DeletePages({ pageIds, onClose, onDelete }: Readonly<{
  pageIds: number[];
  onClose: () => void;
  onDelete: () => void;
}>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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
    <Dialog title={`Delete ${count} ${noun}?`} busy={busy} onClose={onClose}>
      {(close, complete) => <>
      <BodyText tone="muted" className={clsx("wrap-anywhere")}>{count} {noun} will be permanently deleted. This can’t be undone.</BodyText>
      {error && <BodyText role="alert" tone="error" className={clsx("mt-4")}>{error}</BodyText>}
      <div className={clsx("mt-8 flex justify-end gap-3")}>
        <button type="button" autoFocus disabled={busy} onClick={close} className={clsx("rounded-md border border-ink/15 px-4 py-2 text-sm", "hover:bg-ink/5")}>Cancel</button>
        <button type="button" disabled={busy} onClick={() => confirmDelete(complete)} className={clsx("rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white", "hover:bg-red-800")}>{busy ? "Deleting…" : `Delete ${count} ${noun}`}</button>
      </div>
      </>}
    </Dialog>
  );
}
