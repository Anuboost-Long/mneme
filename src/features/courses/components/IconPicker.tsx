import clsx from "clsx";
import { useState } from "react";

import { errorMessage } from "../../../shared/lib/errorMessage";
import { isFileReference } from "../../../shared/lib/fileReference";
import { IMAGE_EXTENSIONS, pickFiles } from "../../../shared/lib/pickFiles";
import CourseIcon, { courseIcons } from "../../../shared/ui/CourseIcon";
import { TextInput } from "../../../shared/ui/Input";
import { BodyText, Typography } from "../../../shared/ui/Typography";
import { courseImage } from "../lib/course-image";

const isPicture = (icon: string | null) => (icon?.startsWith("data:image/") ?? false) || isFileReference(icon);
const isPreset = (icon: string | null) => (courseIcons as readonly (string | null)[]).includes(icon);

// A preset, an emoji or symbol, or an uploaded picture. With `allowNone`
// (modules), clearing a choice means no icon rather than the book preset.
// `onBusyChange` reports an upload in progress, so the form can wait.
export default function IconPicker({ value, onChange, color, allowNone = false, onBusyChange }: Readonly<{
  value: string | null;
  onChange: (icon: string | null) => void;
  color: string | null;
  allowNone?: boolean;
  onBusyChange: (busy: boolean) => void;
}>) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fallback = allowNone ? null : "book";

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    onBusyChange(true);
    setError("");
    try {
      onChange(await courseImage(file));
    } catch (error_) {
      setError(errorMessage(error_, "Couldn’t add this picture. Try another file."));
    } finally {
      setUploading(false);
      onBusyChange(false);
    }
  }

  return (
    <>
      <fieldset>
        <Typography as="legend" variant="label" className={clsx("mb-2")}>Icon</Typography>
        <div className={clsx("flex flex-wrap gap-2")}>
          {allowNone && (
            <label className={clsx("relative flex size-10 cursor-pointer items-center justify-center rounded-md", "border border-dashed border-ink/25", "text-xs text-muted", "has-checked:ring-2 has-checked:ring-ink has-focus-visible:outline-1 has-focus-visible:outline-offset-4")}>
              <input type="radio" name="icon" checked={value === null} onChange={() => onChange(null)} className={clsx("sr-only")} aria-label="No icon" />
              <span>None</span>
            </label>
          )}
          {courseIcons.map((preset) => (
            <label key={preset} className={clsx("relative flex cursor-pointer items-center justify-center rounded-md p-1", "has-checked:ring-2 has-checked:ring-ink has-focus-visible:outline-1 has-focus-visible:outline-offset-4")}>
              <input type="radio" name="icon" value={preset} checked={value === preset} onChange={() => onChange(preset)} className={clsx("sr-only")} aria-label={preset[0].toUpperCase() + preset.slice(1)} />
              <CourseIcon icon={preset} color={color} />
            </label>
          ))}
        </div>
      </fieldset>
      <div className={clsx("space-y-3")}>
        <TextInput
          label="Custom icon"
          value={value && !isPreset(value) && !isPicture(value) ? value : ""}
          maxLength={8}
          onChange={(event) => onChange(event.target.value || fallback)}
          placeholder="Paste an emoji or symbol"
        />
        <button
          type="button"
          onClick={() =>
            void pickFiles({ extensions: IMAGE_EXTENSIONS })
              .then(([file]) => upload(file))
              .catch((error_) => setError(errorMessage(error_, "Couldn’t open the file picker. Try again.")))
          }
          className={clsx("inline-flex items-center rounded-md", "border border-ink/20", "px-3 py-2 text-sm", "hover:bg-ink/5 focus-visible:outline-1 focus-visible:outline-offset-4")}
        >
          {uploading ? "Adding picture…" : "Upload picture"}
        </button>
        {isPicture(value) && (
          <button type="button" onClick={() => onChange(fallback)} className={clsx("ml-3 text-sm underline underline-offset-4")}>
            Remove picture
          </button>
        )}
        <BodyText tone="muted">PNG, JPEG, WebP, GIF or SVG, up to 10 MB.</BodyText>
        {error && <BodyText role="alert" tone="error">{error}</BodyText>}
      </div>
    </>
  );
}
