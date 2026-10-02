import { useState, type FormEvent } from "react";
import clsx from "clsx";
import { PageType, pageTypes, type Page } from "../lib/page/types";
import { createPage, updatePage } from "../lib/page/actions";
import Dialog from "../../../shared/ui/Dialog";
import { TextInput } from "../../../shared/ui/Input";
import Select from "../../../shared/ui/Select";
import { BodyText } from "../../../shared/ui/Typography";
import { CompletionStatus, completionStatuses, completionStatusLabels } from "../lib/completion-status";
import CoverPicker, { saveWithCover, type CoverChoice } from "./CoverPicker";
import IconPicker from "./IconPicker";

export const pageTypeLabels: Record<PageType, string> = {
  [PageType.Lesson]: "Lesson",
  [PageType.Lecture]: "Lecture",
  [PageType.Exercise]: "Exercise",
  [PageType.Discussion]: "Discussion",
  [PageType.Assignment]: "Assignment",
  [PageType.Notes]: "Notes",
  [PageType.Reading]: "Reading",
  [PageType.Revision]: "Revision",
  [PageType.Custom]: "Custom",
};

// `courseColor` tints the icon choices, as the page's icon is shown.
export default function PageForm({ moduleId, courseColor, page, onSave, onClose }: Readonly<{
  moduleId: number;
  courseColor: string | null;
  page?: Page;
  onSave: (page: Page) => void;
  onClose: () => void;
}>) {
  const [title, setTitle] = useState(page?.title ?? "");
  const [type, setType] = useState<PageType>(page?.type ?? PageType.Lesson);
  const [status, setStatus] = useState<CompletionStatus>(page?.status ?? CompletionStatus.NotStarted);
  const [icon, setIcon] = useState<string | null>(page?.icon ?? null);
  const [cover, setCover] = useState<CoverChoice>({ reference: page?.cover ?? null, file: null });
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>, complete: (callback: () => void) => void) {
    event.preventDefault();
    if (busy || uploading) return;
    if (!title.trim()) { setError("Enter a page title."); return; }
    setBusy(true);
    setError("");
    try {
      const saved = await saveWithCover(cover, (reference) => {
        const input = { title, type, status, icon, cover: reference, progress: status === CompletionStatus.Completed ? 100 : undefined };
        return page ? updatePage(page.id, input) : createPage(moduleId, input);
      });
      complete(() => onSave(saved));
    } catch {
      setError("Couldn’t save the page. Your changes are still here. Try again.");
      setBusy(false);
    }
  }

  return (
    <Dialog title={page ? "Edit page" : "Create page"} onClose={onClose} busy={busy || uploading}>
      {(close, complete) => <>
      <form onSubmit={(event) => save(event, complete)}>
        <fieldset disabled={busy || uploading} className={clsx("space-y-5")}>
          <TextInput label="Page title" autoFocus required name="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Introduction" />
          <Select label="Type" value={type} onChange={setType} options={pageTypes.map((value) => ({ value, label: pageTypeLabels[value] }))} />
          <Select label="Status" value={status} onChange={setStatus} options={completionStatuses.map((value) => ({ value, label: completionStatusLabels[value] }))} />
          <IconPicker value={icon} onChange={setIcon} color={courseColor} allowNone onBusyChange={setUploading} />
          <CoverPicker value={cover} onChange={setCover} />
        </fieldset>
        {error && <BodyText role="alert" tone="error" className={clsx("mt-4")}>{error}</BodyText>}
        <div className={clsx("mt-8 flex justify-end gap-3 border-t border-ink/10 pt-5")}>
          <button type="button" disabled={busy || uploading} onClick={close} className={clsx("rounded-md border border-ink/15 px-4 py-2 text-sm font-medium", "hover:bg-ink/5")}>Cancel</button>
          <button type="submit" disabled={busy || uploading} className={clsx("rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action", "hover:bg-action/85")}>{busy ? "Saving…" : page ? "Save changes" : "Create page"}</button>
        </div>
      </form>
      </>}
    </Dialog>
  );
}
