import { useState, type FormEvent } from "react";
import clsx from "clsx";
import { createModule, ModuleStatus, moduleStatuses, moduleStatusLabels, updateModule, type Module } from "../lib/modules";
import Dialog from "../../../shared/ui/Dialog";
import { TextArea, TextInput } from "../../../shared/ui/Input";
import { BodyText, Typography } from "../../../shared/ui/Typography";

export { moduleStatusLabels };

export default function ModuleForm({ courseId, module, onSave, onClose }: Readonly<{
  courseId: number;
  module?: Module;
  onSave: (module: Module) => void;
  onClose: () => void;
}>) {
  const [name, setName] = useState(module?.name ?? "");
  const [description, setDescription] = useState(module?.description ?? "");
  const [status, setStatus] = useState<ModuleStatus>(module?.status ?? ModuleStatus.NotStarted);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>, complete: (callback: () => void) => void) {
    event.preventDefault();
    if (busy) return;
    if (!name.trim()) { setError("Enter a module name."); return; }
    setBusy(true);
    setError("");
    try {
      const input = { name, description, status };
      const saved = module ? await updateModule(module.id, input) : await createModule(courseId, input);
      complete(() => onSave(saved));
    } catch {
      setError("Couldn’t save the module. Your changes are still here. Try again.");
      setBusy(false);
    }
  }

  return (
    <Dialog title={module ? "Edit module" : "Create module"} onClose={onClose} busy={busy}>
      {(close, complete) => <>
      <form onSubmit={(event) => save(event, complete)}>
        <fieldset disabled={busy} className={clsx("space-y-5")}>
          <TextInput label="Module name" autoFocus required name="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Module 1 — Introduction" />
          <TextArea label="Description" name="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What does this module cover?" />
          <div className={clsx("space-y-2")}>
            <label htmlFor="module-status" className={clsx("block")}><Typography as="span" variant="label">Status</Typography></label>
            <select id="module-status" name="status" value={status} onChange={(event) => setStatus(Number(event.target.value) as ModuleStatus)} className={clsx("block h-11 w-full min-w-0 rounded-md", "bg-surface border border-ink/20", "text-sm font-normal text-ink", "px-3 py-2.5", "focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink")}>
              {moduleStatuses.map((value) => <option key={value} value={value}>{moduleStatusLabels[value]}</option>)}
            </select>
          </div>
        </fieldset>
        {error && <BodyText role="alert" tone="error" className={clsx("mt-4")}>{error}</BodyText>}
        <div className={clsx("mt-8 flex justify-end gap-3 border-t border-ink/10 pt-5")}>
          <button type="button" disabled={busy} onClick={close} className={clsx("rounded-md border border-ink/15 px-4 py-2 text-sm font-medium", "hover:bg-ink/5")}>Cancel</button>
          <button type="submit" disabled={busy} className={clsx("rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action", "hover:bg-action/85")}>{busy ? "Saving…" : module ? "Save changes" : "Create module"}</button>
        </div>
      </form>
      </>}
    </Dialog>
  );
}
