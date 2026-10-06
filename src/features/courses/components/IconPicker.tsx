import { courseImage } from "@/features/courses/lib/icon/actions";
import { errorMessage } from "@/shared/lib/errorMessage";
import { isFileReference } from "@/shared/lib/fileReference";
import { IMAGE_EXTENSIONS, pickFiles } from "@/shared/lib/pickFiles";
import CourseIcon from "@/shared/ui/CourseIcon";
import { iconChoices, iconGroups } from "@/shared/ui/iconCatalogue";
import { TextInput } from "@/shared/ui/Input";
import { BodyText, Caption, Typography } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useState } from "react";

const isPicture = (icon: string | null) =>
  (icon?.startsWith("data:image/") ?? false) || isFileReference(icon);
const isPreset = (icon: string | null) => icon !== null && iconChoices.has(icon);

function matchingGroups(search: string) {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (text: string) => words.every((word) => text.toLowerCase().includes(word));
  return iconGroups
    .map((group) => ({
      ...group,
      icons: group.icons.filter(({ key, label }) => matches(`${label} ${key} ${group.name}`))
    }))
    .filter((group) => group.icons.length > 0);
}

// A preset, an emoji or symbol, or an uploaded picture. With `allowNone`
// (modules), clearing a choice means no icon rather than the book preset.
// `onBusyChange` reports an upload in progress, so the form can wait.
export default function IconPicker({
  value,
  onChange,
  color,
  allowNone = false,
  onBusyChange
}: Readonly<{
  value: string | null;
  onChange: (icon: string | null) => void;
  color: string | null;
  allowNone?: boolean;
  onBusyChange: (busy: boolean) => void;
}>) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const groups = matchingGroups(search);
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
        <Typography as="legend" variant="label" className={clsx("mb-2")}>
          Icon
        </Typography>
        <TextInput
          label="Search icons"
          showRequirement={false}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && event.preventDefault()}
          placeholder="Biology, law, music…"
        />
        <div className={clsx("mt-3 max-h-72 space-y-4 overflow-y-auto p-1")}>
          {allowNone && (
            <label
              className={clsx(
                "relative flex size-10 cursor-pointer items-center justify-center rounded-md",
                "border border-dashed border-ink/25",
                "text-xs text-muted",
                "has-checked:ring-2 has-checked:ring-ink has-focus-visible:outline-1 has-focus-visible:outline-offset-4"
              )}
            >
              <input
                type="radio"
                name="icon"
                checked={value === null}
                onChange={() => onChange(null)}
                className={clsx("sr-only")}
                aria-label="No icon"
              />
              <span>None</span>
            </label>
          )}
          {groups.map((group) => (
            <div key={group.name}>
              <Caption tone="muted" className={clsx("mb-1.5")}>
                {group.name}
              </Caption>
              <div className={clsx("flex flex-wrap gap-1")}>
                {group.icons.map(({ key, label }) => (
                  <label
                    key={key}
                    title={label}
                    className={clsx(
                      "relative flex cursor-pointer items-center justify-center rounded-md p-1",
                      "has-checked:ring-2 has-checked:ring-ink has-focus-visible:outline-1 has-focus-visible:outline-offset-4"
                    )}
                  >
                    <input
                      type="radio"
                      name="icon"
                      value={key}
                      checked={value === key}
                      onChange={() => onChange(key)}
                      className={clsx("sr-only")}
                      aria-label={label}
                    />
                    <CourseIcon icon={key} color={color} />
                  </label>
                ))}
              </div>
            </div>
          ))}
          {groups.length === 0 && (
            <BodyText tone="muted">
              No icons match “{search.trim()}”. Paste an emoji or symbol below instead.
            </BodyText>
          )}
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
              .catch((error_) =>
                setError(errorMessage(error_, "Couldn’t open the file picker. Try again."))
              )
          }
          className={clsx(
            "inline-flex items-center rounded-md",
            "border border-ink/20",
            "px-3 py-2 text-sm",
            "hover:bg-ink/5 focus-visible:outline-1 focus-visible:outline-offset-4"
          )}
        >
          {uploading ? "Adding picture…" : "Upload picture"}
        </button>
        {isPicture(value) && (
          <button
            type="button"
            onClick={() => onChange(fallback)}
            className={clsx("ml-3 text-sm underline underline-offset-4")}
          >
            Remove picture
          </button>
        )}
        <BodyText tone="muted">PNG, JPEG, WebP, GIF or SVG, up to 10 MB.</BodyText>
        {error && (
          <BodyText role="alert" tone="error">
            {error}
          </BodyText>
        )}
      </div>
    </>
  );
}
