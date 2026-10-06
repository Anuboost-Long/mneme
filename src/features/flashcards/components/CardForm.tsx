import type { Page } from "@/features/courses/lib/page/types";
import { addCards, editCard } from "@/features/flashcards/lib/card/actions";
import type { Flashcard } from "@/features/flashcards/lib/card/types";
import { useResetOnOpen } from "@/shared/lib/dialogState";
import { errorMessage } from "@/shared/lib/errorMessage";
import Dialog from "@/shared/ui/Dialog";
import { TextArea } from "@/shared/ui/Input";
import Select from "@/shared/ui/Select";
import { BodyText } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useState, type SubmitEvent } from "react";

export default function CardForm({
  open,
  moduleId,
  card,
  pages,
  onSaved,
  onClose
}: Readonly<{
  open: boolean;
  moduleId: number;
  card: Flashcard | null;
  pages: Page[];
  onSaved: () => void;
  onClose: () => void;
}>) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [pageId, setPageId] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useResetOnOpen(open, () => {
    setFront(card?.front ?? "");
    setBack(card?.back ?? "");
    setPageId(card?.page_id ?? 0);
    setBusy(false);
    setError("");
  });

  async function save(
    event: SubmitEvent<HTMLFormElement>,
    complete: (callback: () => void) => void
  ) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (card) await editCard(card.id, front, back, pageId || null);
      else await addCards(moduleId, [{ front, back, page_id: pageId || null }]);
      complete(() => {
        onSaved();
        onClose();
      });
    } catch (error_) {
      setError(errorMessage(error_, "Couldn’t save this card. Try again."));
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} title={card ? "Edit card" : "Add card"} onClose={onClose} busy={busy}>
      {(close, complete) => (
        <form onSubmit={(event) => void save(event, complete)} className={clsx("space-y-5")}>
          <TextArea
            label="Front"
            required
            autoFocus
            rows={2}
            value={front}
            onChange={(event) => setFront(event.target.value)}
            placeholder="What is a threat actor?"
          />
          <TextArea
            label="Back"
            required
            rows={3}
            value={back}
            onChange={(event) => setBack(event.target.value)}
            placeholder="The person or group that actually carries out a cyber-attack."
          />
          <Select
            label="Comes from"
            value={pageId}
            onChange={setPageId}
            options={[
              { value: 0, label: "No page" },
              ...pages.map((page) => ({ value: page.id, label: page.title }))
            ]}
          />
          {error && (
            <BodyText role="alert" tone="error">
              {error}
            </BodyText>
          )}
          <div className={clsx("flex justify-end gap-3 border-t border-ink/10 pt-5")}>
            <button
              type="button"
              disabled={busy}
              onClick={close}
              className={clsx(
                "rounded-md border border-ink/15 px-4 py-2 text-sm font-medium",
                "hover:bg-ink/5"
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className={clsx(
                "rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action",
                "hover:bg-action/85"
              )}
            >
              {card ? "Save card" : "Add card"}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
