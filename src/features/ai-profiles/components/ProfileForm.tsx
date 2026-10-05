import clsx from "clsx";
import { useState, type SubmitEvent } from "react";

import { useResetOnOpen } from "../../../shared/lib/dialogState";
import { errorMessage } from "../../../shared/lib/errorMessage";
import Dialog from "../../../shared/ui/Dialog";
import { TextInput } from "../../../shared/ui/Input";
import Select from "../../../shared/ui/Select";
import { BodyText, Caption, Typography } from "../../../shared/ui/Typography";
import {
  AnswerLength,
  answerLengths,
  ExplanationLevel,
  explanationLevels,
  languages,
  Tone,
  tones,
  toggles
} from "../lib/preferences";
import { createProfile, updateProfile } from "../lib/profile/actions";
import type { AiProfile, ProfileInput } from "../lib/profile/types";

const anyLanguage = "";

function options<T extends number>(labels: Record<T, { label: string } | null>) {
  return (Object.entries(labels) as [string, { label: string } | null][]).map(
    ([value, option]) => ({ value: Number(value) as T, label: option?.label ?? "No preference" })
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint
}: Readonly<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint: string;
}>) {
  return (
    <label className={clsx("flex cursor-pointer items-start gap-3 py-1.5")}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
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

function profileInput(profile: AiProfile | null | undefined): ProfileInput {
  return {
    name: profile?.name ?? "",
    language: profile?.language ?? null,
    explanationLevel: profile?.explanationLevel ?? ExplanationLevel.Any,
    tone: profile?.tone ?? Tone.Any,
    answerLength: profile?.answerLength ?? AnswerLength.Any,
    keepTerms: profile?.keepTerms ?? false,
    useExamples: profile?.useExamples ?? false,
    hintsForAssessed: profile?.hintsForAssessed ?? false
  };
}

export default function ProfileForm({
  open,
  profile,
  onSave,
  onClose
}: Readonly<{
  open: boolean;
  profile?: AiProfile | null;
  onSave: () => void;
  onClose: () => void;
}>) {
  const [input, setInput] = useState<ProfileInput>(() => profileInput(profile));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useResetOnOpen(open, () => {
    setInput(profileInput(profile));
    setBusy(false);
    setError("");
  });
  const submitLabel = profile ? "Save changes" : "Create profile";
  const change = (patch: Partial<ProfileInput>) =>
    setInput((current) => ({ ...current, ...patch }));

  async function save(
    event: SubmitEvent<HTMLFormElement>,
    complete: (callback: () => void) => void
  ) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (profile) await updateProfile(profile.id, input);
      else await createProfile(input);
      complete(onSave);
    } catch (error) {
      setError(
        errorMessage(error, "Couldn’t save the profile. Your changes are still here. Try again.")
      );
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} title={profile ? "Edit profile" : "New profile"} onClose={onClose} busy={busy}>
      {(close, complete) => (
        <form onSubmit={(event) => save(event, complete)}>
          <fieldset disabled={busy} className={clsx("space-y-6")}>
            <TextInput
              label="Name"
              required
              name="name"
              value={input.name}
              onChange={(event) => change({ name: event.target.value })}
              placeholder="e.g. University study"
            />
            <div className={clsx("grid gap-4 sm:grid-cols-2")}>
              <Select
                label="Language"
                value={input.language ?? anyLanguage}
                onChange={(value) => change({ language: value || null })}
                options={[
                  { value: anyLanguage, label: "No preference" },
                  ...Object.entries(languages).map(([value, option]) => ({
                    value,
                    label: option.label
                  }))
                ]}
              />
              <Select
                label="Explanation level"
                value={input.explanationLevel}
                onChange={(value) => change({ explanationLevel: value })}
                options={options(explanationLevels)}
              />
              <Select
                label="Tone"
                value={input.tone}
                onChange={(value) => change({ tone: value })}
                options={options(tones)}
              />
              <Select
                label="Length"
                value={input.answerLength}
                onChange={(value) => change({ answerLength: value })}
                options={options(answerLengths)}
              />
            </div>
            <fieldset>
              <Typography as="legend" variant="label" className={clsx("mb-1")}>
                Also
              </Typography>
              {(Object.keys(toggles) as (keyof typeof toggles)[]).map((key) => (
                <Toggle
                  key={key}
                  checked={input[key]}
                  onChange={(checked) => change({ [key]: checked })}
                  label={toggles[key].label}
                  hint={toggles[key].hint}
                />
              ))}
            </fieldset>
            <Caption as="p" tone="muted">
              These shape how the agent writes. An action’s own task still decides what it produces.
            </Caption>
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
