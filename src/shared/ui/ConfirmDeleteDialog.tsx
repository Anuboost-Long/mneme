import clsx from "clsx";
import { useState } from "react";

import { useResetOnOpen } from "../lib/dialogState";
import { errorMessage } from "../lib/errorMessage";
import Dialog from "./Dialog";
import { BodyText } from "./Typography";

export default function ConfirmDeleteDialog({
  open,
  title,
  message,
  confirmLabel,
  failure,
  onConfirm,
  onClose,
  onDeleted
}: Readonly<{
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  /** Shown when onConfirm fails and the error carries no message of its own. */
  failure: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  onDeleted: () => void;
}>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useResetOnOpen(open, () => {
    setBusy(false);
    setError("");
  });

  async function confirm(complete: (callback: () => void) => void) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onConfirm();
      complete(onDeleted);
    } catch (error_) {
      setError(errorMessage(error_, failure));
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} title={title} busy={busy} onClose={onClose}>
      {(close, complete) => (
        <>
          <BodyText tone="muted" className={clsx("wrap-anywhere")}>
            {message}
          </BodyText>
          {error && (
            <BodyText role="alert" tone="error" className={clsx("mt-4")}>
              {error}
            </BodyText>
          )}
          <div className={clsx("mt-8 flex justify-end gap-3")}>
            <button
              type="button"
              disabled={busy}
              onClick={close}
              className={clsx("rounded-md border border-ink/15 px-4 py-2 text-sm", "hover:bg-ink/5")}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void confirm(complete)}
              className={clsx(
                "rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white",
                "hover:bg-red-800"
              )}
            >
              {busy ? "Deleting…" : confirmLabel}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
