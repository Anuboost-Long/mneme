import { createAction, updateAction } from "@/features/ai-actions/lib/action/actions";
import {
  ActionOutput,
  ActionScope,
  type ActionInput,
  type AiAction
} from "@/features/ai-actions/lib/action/types";
import { pageTypeLabels } from "@/features/courses/components/PageForm";
import { pageTypes, type PageType } from "@/features/courses/lib/page/types";
import { useResetOnOpen } from "@/shared/lib/dialogState";
import { errorMessage } from "@/shared/lib/errorMessage";
import Dialog from "@/shared/ui/Dialog";
import { TextArea, TextInput } from "@/shared/ui/Input";
import { BodyText, Caption, Typography } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useState, type SubmitEvent } from "react";

import ActionIcon, { actionIconLabels, actionIcons } from "./ActionIcon";

const scopeOptions: { value: ActionScope; label: string; hint: string }[] = [
  {
    value: ActionScope.Page,
    label: "Selected text or page",
    hint: "The selection if there is one, otherwise the whole page."
  },
  { value: ActionScope.Module, label: "Whole module", hint: "Every page in the page’s module." },
  {
    value: ActionScope.Course,
    label: "Whole course",
    hint: "Every page in every module of the course."
  }
];

const outputOptions: { value: ActionOutput; label: string; hint: string }[] = [
  {
    value: ActionOutput.Preview,
    label: "Show a preview",
    hint: "You choose whether to insert, replace, or copy it."
  },
  {
    value: ActionOutput.InsertBelow,
    label: "Insert below",
    hint: "Added after the selection, or at the end of the page."
  },
  {
    value: ActionOutput.NewPage,
    label: "New page",
    hint: "Saved as a new page in the same module, then opened."
  }
];

function Choice({
  name,
  checked,
  onChange,
  label,
  hint
}: Readonly<{
  name: string;
  checked: boolean;
  onChange: () => void;
  label: string;
  hint: string;
}>) {
  return (
    <label className={clsx("flex cursor-pointer items-start gap-3 py-1.5")}>
      <input
        type="radio"
        name={name}
        checked={checked}
        onChange={onChange}
        className={clsx("mt-1 accent-current")}
      />
      <span className={clsx("flex min-w-0 flex-col")}>
        <span className={clsx("text-sm")}>{label}</span>
        <Caption as="span" tone="muted">
          {hint}
        </Caption>
      </span>
    </label>
  );
}

function actionInput(action: AiAction | null | undefined): ActionInput {
  return {
    name: action?.name ?? "",
    prompt: action?.prompt ?? "",
    icon: action?.icon ?? null,
    scope: action?.scope ?? ActionScope.Page,
    output: action?.output ?? ActionOutput.Preview,
    pageTypes: action?.pageTypes ?? null
  };
}

export default function ActionForm({
  open,
  action,
  onSave,
  onClose
}: Readonly<{
  open: boolean;
  action?: AiAction | null;
  onSave: () => void;
  onClose: () => void;
}>) {
  const [input, setInput] = useState<ActionInput>(() => actionInput(action));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useResetOnOpen(open, () => {
    setInput(actionInput(action));
    setBusy(false);
    setError("");
  });
  const submitLabel = action ? "Save changes" : "Create action";
  const change = (patch: Partial<ActionInput>) => setInput((current) => ({ ...current, ...patch }));

  function togglePageType(type: PageType) {
    const current = input.pageTypes ?? [];
    change({
      pageTypes: current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type]
    });
  }

  async function save(
    event: SubmitEvent<HTMLFormElement>,
    complete: (callback: () => void) => void
  ) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (action) await updateAction(action.id, input);
      else await createAction(input);
      complete(onSave);
    } catch (error) {
      setError(
        errorMessage(error, "Couldn’t save the action. Your changes are still here. Try again.")
      );
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} title={action ? "Edit action" : "New action"} onClose={onClose} busy={busy}>
      {(close, complete) => (
        <form onSubmit={(event) => save(event, complete)}>
          <fieldset disabled={busy} className={clsx("space-y-6")}>
            <TextInput
              label="Name"
              required
              name="name"
              value={input.name}
              onChange={(event) => change({ name: event.target.value })}
              placeholder="e.g. Prepare discussion"
            />
            <TextArea
              label="Instructions"
              required
              name="prompt"
              rows={5}
              value={input.prompt}
              onChange={(event) => change({ prompt: event.target.value })}
              hint="What the agent should do. The page content is added for you."
              placeholder="e.g. Explain what I should discuss and identify the important concepts."
            />
            <fieldset>
              <Typography as="legend" variant="label" className={clsx("mb-2")}>
                Icon
              </Typography>
              <div className={clsx("flex flex-wrap gap-2")}>
                {[null, ...actionIcons].map((icon) => (
                  <label
                    key={icon ?? "none"}
                    title={icon ? actionIconLabels[icon] : "No icon"}
                    className={clsx(
                      "flex size-10 cursor-pointer items-center justify-center rounded-md",
                      "border border-ink/15 text-muted",
                      "hover:bg-ink/5 hover:text-ink has-checked:border-ink has-checked:text-ink has-focus-visible:outline-2 has-focus-visible:outline-offset-2"
                    )}
                  >
                    <input
                      type="radio"
                      name="icon"
                      checked={input.icon === icon}
                      onChange={() => change({ icon })}
                      aria-label={icon ? actionIconLabels[icon] : "No icon"}
                      className={clsx("sr-only")}
                    />
                    {icon ? (
                      <ActionIcon icon={icon} />
                    ) : (
                      <span aria-hidden="true" className={clsx("text-xs")}>
                        None
                      </span>
                    )}
                  </label>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <Typography as="legend" variant="label" className={clsx("mb-1")}>
                Runs on
              </Typography>
              {scopeOptions.map((option) => (
                <Choice
                  key={option.value}
                  name="scope"
                  checked={input.scope === option.value}
                  onChange={() => change({ scope: option.value })}
                  label={option.label}
                  hint={option.hint}
                />
              ))}
            </fieldset>
            {input.scope !== ActionScope.Page && (
              <fieldset>
                <Typography as="legend" variant="label">
                  Only these page types
                </Typography>
                <Caption as="p" tone="muted" className={clsx("mt-1 mb-2")}>
                  Leave all unticked to include every page.
                </Caption>
                <div className={clsx("grid grid-cols-2 gap-x-4 sm:grid-cols-3")}>
                  {pageTypes.map((type) => (
                    <label
                      key={type}
                      className={clsx("flex cursor-pointer items-center gap-2 py-1 text-sm")}
                    >
                      <input
                        type="checkbox"
                        checked={input.pageTypes?.includes(type) ?? false}
                        onChange={() => togglePageType(type)}
                        className={clsx("accent-current")}
                      />
                      {pageTypeLabels[type]}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}
            <fieldset>
              <Typography as="legend" variant="label" className={clsx("mb-1")}>
                Result
              </Typography>
              {outputOptions.map((option) => (
                <Choice
                  key={option.value}
                  name="output"
                  checked={input.output === option.value}
                  onChange={() => change({ output: option.value })}
                  label={option.label}
                  hint={option.hint}
                />
              ))}
            </fieldset>
          </fieldset>
          {error && (
            <BodyText role="alert" tone="error" className={clsx("mt-4")}>
              {error}
            </BodyText>
          )}
          <div className={clsx("mt-8 flex justify-end gap-3 border-t border-ink/10 pt-5")}>
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
              {busy ? "Saving…" : submitLabel}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
