import { useState } from "react";
import clsx from "clsx";
import { deleteModule, type Module } from "../lib/modules";
import Dialog from "../../../shared/ui/Dialog";
import { BodyText } from "../../../shared/ui/Typography";

export default function DeleteModule({ module, onClose, onDelete }: Readonly<{
  module: Module;
  onClose: () => void;
  onDelete: () => void;
}>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirmDelete(complete: (callback: () => void) => void) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await deleteModule(module.id);
      complete(onDelete);
    } catch {
      setError("Couldn’t delete the module. Try again.");
      setBusy(false);
    }
  }

  return (
    <Dialog title="Delete module?" busy={busy} onClose={onClose}>
      {(close, complete) => <>
      <BodyText tone="muted" className={clsx("wrap-anywhere")}>“{module.name}” will be permanently deleted. This can’t be undone.</BodyText>
      {error && <BodyText role="alert" tone="error" className={clsx("mt-4")}>{error}</BodyText>}
      <div className={clsx("mt-8 flex justify-end gap-3")}>
        <button type="button" autoFocus disabled={busy} onClick={close} className={clsx("rounded-md border border-ink/15 px-4 py-2 text-sm", "hover:bg-ink/5")}>Cancel</button>
        <button type="button" disabled={busy} onClick={() => confirmDelete(complete)} className={clsx("rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white", "hover:bg-red-800")}>{busy ? "Deleting…" : "Delete module"}</button>
      </div>
      </>}
    </Dialog>
  );
}
