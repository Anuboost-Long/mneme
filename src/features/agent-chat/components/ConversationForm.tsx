import type { Conversation } from "@/features/agent-chat/lib/conversation/types";
import { useResetOnOpen } from "@/shared/lib/dialogState";
import { errorMessage } from "@/shared/lib/errorMessage";
import Dialog from "@/shared/ui/Dialog";
import { TextInput } from "@/shared/ui/Input";
import { BodyText } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useState } from "react";

export default function ConversationForm({
  open,
  action,
  conversation,
  onRename,
  onDelete,
  onClose
}: Readonly<{
  open: boolean;
  action: "rename" | "delete";
  conversation?: Conversation;
  onRename: (id: number, title: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  onClose: () => void;
}>) {
  const [title, setTitle] = useState(conversation?.title ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useResetOnOpen(open, () => {
    setTitle(conversation?.title ?? "");
    setBusy(false);
    setError("");
  });
  const labels = { rename: "Rename conversation", delete: "Delete conversation" };

  async function save(complete: (callback: () => void) => void) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      switch (action) {
        case "rename":
          if (conversation) await onRename(conversation.id, title);
          break;
        case "delete":
          if (conversation) await onDelete(conversation.id);
          break;
      }
      complete(onClose);
    } catch (error) {
      setError(errorMessage(error, "Couldn’t save this change. Try again."));
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} title={labels[action]} onClose={onClose} busy={busy}>
      {(close, complete) => (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save(complete);
          }}
        >
          {action === "rename" && (
            <TextInput
              label="Conversation title"
              required
              data-autofocus
              value={title}
              disabled={busy}
              onChange={(event) => setTitle(event.target.value)}
            />
          )}
          {action === "delete" && (
            <BodyText>
              Delete “{conversation?.title ?? "New conversation"}” and all its messages? This cannot
              be undone. Usage totals will remain.
            </BodyText>
          )}
          {error && (
            <BodyText role="alert" tone="error" className={clsx("mt-4")}>
              {error}
            </BodyText>
          )}
          <div className={clsx("mt-6 flex justify-end gap-3 border-t border-ink/10 pt-5")}>
            <button
              type="button"
              disabled={busy}
              onClick={close}
              className={clsx("rounded-md border border-ink/15 px-3 py-2 text-sm")}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className={clsx(
                "rounded-md px-3 py-2 text-sm",
                action === "delete"
                  ? "bg-red-700 text-white hover:bg-red-800"
                  : "bg-action text-on-action",
                "disabled:opacity-50"
              )}
            >
              {busy ? "Saving…" : labels[action]}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
