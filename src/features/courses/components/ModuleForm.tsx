import clsx from "clsx";
import { useState, type FormEvent } from "react";

import Dialog from "../../../shared/ui/Dialog";
import { TextArea, TextInput } from "../../../shared/ui/Input";
import Select from "../../../shared/ui/Select";
import { BodyText } from "../../../shared/ui/Typography";
import { createModule, updateModule } from "../lib/module/actions";
import { ModuleStatus, moduleStatuses, moduleStatusLabels, type Module } from "../lib/module/types";
import IconPicker from "./IconPicker";

export { moduleStatusLabels };

// `courseColor` tints the icon choices, as the module's icon is shown.
export default function ModuleForm({
  courseId,
  courseColor,
  module,
  onSave,
  onClose
}: Readonly<{
  courseId: number;
  courseColor: string | null;
  module?: Module;
  onSave: (module: Module) => void;
  onClose: () => void;
}>) {
  const [name, setName] = useState(module?.name ?? "");
  const [description, setDescription] = useState(module?.description ?? "");
  const [status, setStatus] = useState<ModuleStatus>(module?.status ?? ModuleStatus.NotStarted);
  const [icon, setIcon] = useState<string | null>(module?.icon ?? null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save(event: FormEvent<HTMLFormElement>, complete: (callback: () => void) => void) {
    event.preventDefault();
    if (busy || uploading) return;
    if (!name.trim()) {
      setError("Enter a module name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const input = { name, description, status, icon };
      const saved = module
        ? await updateModule(module.id, input)
        : await createModule(courseId, input);
      complete(() => onSave(saved));
    } catch {
      setError("Couldn’t save the module. Your changes are still here. Try again.");
      setBusy(false);
    }
  }

  return (
    <Dialog
      title={module ? "Edit module" : "Create module"}
      onClose={onClose}
      busy={busy || uploading}
    >
      {(close, complete) => (
        <>
          <form onSubmit={(event) => save(event, complete)}>
            <fieldset disabled={busy || uploading} className={clsx("space-y-5")}>
              <TextInput
                label="Module name"
                autoFocus
                required
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Module 1 — Introduction"
              />
              <TextArea
                label="Description"
                name="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What does this module cover?"
              />
              <Select
                id="module-status"
                label="Status"
                value={status}
                onChange={setStatus}
                options={moduleStatuses.map((value) => ({
                  value,
                  label: moduleStatusLabels[value]
                }))}
              />
              <IconPicker
                value={icon}
                onChange={setIcon}
                color={courseColor}
                allowNone
                onBusyChange={setUploading}
              />
            </fieldset>
            {error && (
              <BodyText role="alert" tone="error" className={clsx("mt-4")}>
                {error}
              </BodyText>
            )}
            <div className={clsx("mt-8 flex justify-end gap-3 border-t border-ink/10 pt-5")}>
              <button
                type="button"
                disabled={busy || uploading}
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
                disabled={busy || uploading}
                className={clsx(
                  "rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action",
                  "hover:bg-action/85"
                )}
              >
                {busy ? "Saving…" : module ? "Save changes" : "Create module"}
              </button>
            </div>
          </form>
        </>
      )}
    </Dialog>
  );
}
