import { deleteModule } from "@/features/courses/lib/module/actions";
import type { Module } from "@/features/courses/lib/module/types";
import { useResetOnOpen } from "@/shared/lib/dialogState";
import Dialog from "@/shared/ui/Dialog";
import { BodyText } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useState } from "react";

export default function DeleteModule({
  open,
  module,
  onClose,
  onDelete
}: Readonly<{
  open: boolean;
  module: Module | null;
  onClose: () => void;
  onDelete: () => void;
}>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useResetOnOpen(open, () => {
    setBusy(false);
    setError("");
  });

  async function confirmDelete(complete: (callback: () => void) => void) {
    if (busy || !module) return;
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
    <Dialog open={open} title="Delete module?" busy={busy} onClose={onClose}>
      {(close, complete) => (
        <>
          <BodyText tone="muted" className={clsx("wrap-anywhere")}>
            “{module?.name}” moves to Recently deleted. You can restore it from there for 30 days.
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
              {busy ? "Deleting…" : "Delete module"}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
