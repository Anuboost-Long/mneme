import { useState, type FormEvent } from "react";
import clsx from "clsx";
import { createPage, PageType, pageTypes, updatePage, type Page } from "../lib/pages";
import Dialog from "../../../shared/ui/Dialog";
import { TextInput } from "../../../shared/ui/Input";
import Select from "../../../shared/ui/Select";
import { BodyText } from "../../../shared/ui/Typography";

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

export default function PageForm({ moduleId, page, onSave, onClose }: Readonly<{
  moduleId: number;
  page?: Page;
  onSave: (page: Page) => void;
  onClose: () => void;
}>) {
  const [title, setTitle] = useState(page?.title ?? "");
  const [type, setType] = useState<PageType>(page?.type ?? PageType.Lesson);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>, complete: (callback: () => void) => void) {
    event.preventDefault();
    if (busy) return;
    if (!title.trim()) { setError("Enter a page title."); return; }
    setBusy(true);
    setError("");
    try {
      const saved = page ? await updatePage(page.id, { title, type }) : await createPage(moduleId, { title, type });
      complete(() => onSave(saved));
    } catch {
      setError("Couldn’t save the page. Your changes are still here. Try again.");
      setBusy(false);
    }
  }

  return (
    <Dialog title={page ? "Edit page" : "Create page"} onClose={onClose} busy={busy}>
      {(close, complete) => <>
      <form onSubmit={(event) => save(event, complete)}>
        <fieldset disabled={busy} className={clsx("space-y-5")}>
          <TextInput label="Page title" autoFocus required name="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Introduction" />
          <Select label="Type" value={type} onChange={setType} options={pageTypes.map((value) => ({ value, label: pageTypeLabels[value] }))} />
        </fieldset>
        {error && <BodyText role="alert" tone="error" className={clsx("mt-4")}>{error}</BodyText>}
        <div className={clsx("mt-8 flex justify-end gap-3 border-t border-ink/10 pt-5")}>
          <button type="button" disabled={busy} onClick={close} className={clsx("rounded-md border border-ink/15 px-4 py-2 text-sm font-medium", "hover:bg-ink/5")}>Cancel</button>
          <button type="submit" disabled={busy} className={clsx("rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action", "hover:bg-action/85")}>{busy ? "Saving…" : page ? "Save changes" : "Create page"}</button>
        </div>
      </form>
      </>}
    </Dialog>
  );
}
