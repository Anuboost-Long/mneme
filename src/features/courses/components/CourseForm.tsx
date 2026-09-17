import { useState, type FormEvent } from "react";
import clsx from "clsx";
import { createCourse, updateCourse, type Course } from "../lib/courses";
import { courseImage } from "../lib/course-image";
import CourseIcon, { courseColors, courseIcons } from "../../../shared/ui/CourseIcon";
import Dialog from "../../../shared/ui/Dialog";
import { TextArea, TextInput } from "../../../shared/ui/Input";
import { BodyText, Typography } from "../../../shared/ui/Typography";

export default function CourseForm({ course, onSave, onClose }: Readonly<{
  course?: Course;
  onSave: (course: Course) => void;
  onClose: () => void;
}>) {
  const [name, setName] = useState(course?.name ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [icon, setIcon] = useState(course?.icon ?? "book");
  const [color, setColor] = useState(course?.color ?? courseColors[0].value);
  const [rgbDraft, setRgbDraft] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState("");
  const [error, setError] = useState("");

  function chooseColor(value: string) {
    setColor(value);
    setRgbDraft({});
  }

  async function save(event: FormEvent<HTMLFormElement>, complete: (callback: () => void) => void) {
    event.preventDefault();
    if (busy || uploading) return;
    if (!name.trim()) { setError("Enter a course name."); return; }
    setBusy(true);
    setError("");
    try {
      const input = { name, description, icon, color };
      const saved = course ? await updateCourse(course.id, input) : await createCourse(input);
      complete(() => onSave(saved));
    } catch {
      setError("Couldn’t save the course. Your changes are still here. Try again.");
      setBusy(false);
    }
  }

  return (
    <Dialog title={course ? "Edit course" : "Create course"} onClose={onClose} busy={busy || uploading}>
      {(close, complete) => <>
      <form onSubmit={(event) => save(event, complete)}>
        <fieldset disabled={busy || uploading} className={clsx("space-y-5")}>
          <div className={clsx("flex items-center gap-4")}>
            <CourseIcon icon={icon} color={color} large />
            <BodyText tone="muted">Give your course a name and a little character.</BodyText>
          </div>
          <TextInput label="Course name" autoFocus required name="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Introduction to psychology" />
          <TextArea label="Description" name="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What will you explore in this course?" />
          <fieldset>
            <Typography as="legend" variant="label" className={clsx("mb-2")}>Icon</Typography>
            <div className={clsx("flex flex-wrap gap-2")}>
              {courseIcons.map((value) => (
                <label key={value} className={clsx("relative flex cursor-pointer items-center justify-center rounded-md p-1", "has-checked:ring-2 has-checked:ring-ink has-focus-visible:outline-1 has-focus-visible:outline-offset-4")}>
                  <input type="radio" name="icon" value={value} checked={icon === value} onChange={() => setIcon(value)} className={clsx("sr-only")} aria-label={value[0].toUpperCase() + value.slice(1)} />
                  <CourseIcon icon={value} color={color} />
                </label>
              ))}
            </div>
          </fieldset>
          <div className={clsx("space-y-3")}>
            <TextInput label="Custom icon" value={icon && !courseIcons.some((value) => value === icon) && !icon.startsWith("data:image/") ? icon : ""} maxLength={8} onChange={(event) => setIcon(event.target.value || "book")} placeholder="Paste an emoji or symbol" />
            <label className={clsx("relative inline-flex cursor-pointer items-center rounded-md", "border border-ink/20", "px-3 py-2 text-sm", "hover:bg-ink/5 has-focus-visible:outline-1 has-focus-visible:outline-offset-4")}>
              {uploading ? "Adding picture…" : "Upload picture"}
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className={clsx("sr-only")} onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                setUploading(true);
                setImageError("");
                try { setIcon(await courseImage(file)); }
                catch (error) { setImageError(error instanceof Error ? error.message : "Couldn’t add this picture. Try another file."); }
                finally { setUploading(false); }
              }} />
            </label>
            {icon?.startsWith("data:image/") && <button type="button" onClick={() => setIcon("book")} className={clsx("ml-3 text-sm underline underline-offset-4")}>Remove picture</button>}
            <BodyText tone="muted">PNG, JPEG, WebP, GIF or SVG, up to 10 MB.</BodyText>
            {imageError && <BodyText role="alert" tone="error">{imageError}</BodyText>}
          </div>
          <fieldset>
            <Typography as="legend" variant="label" className={clsx("mb-3")}>Colour</Typography>
            <div className={clsx("flex flex-wrap gap-3")}>
              {courseColors.map((value) => (
                <label key={value.value} title={value.name} className={clsx("relative size-7 cursor-pointer rounded-full", "border border-ink/40", "has-checked:ring-2 has-checked:ring-ink has-checked:ring-offset-2 has-checked:ring-offset-surface has-focus-visible:outline-1 has-focus-visible:outline-offset-4")} style={{ backgroundColor: value.value }}>
                  <input type="radio" name="color" value={value.value} checked={color === value.value} onChange={() => chooseColor(value.value)} className={clsx("sr-only")} aria-label={value.name} />
                </label>
              ))}
            </div>
            <div className={clsx("mt-4 flex items-end gap-3")}>
              <label className={clsx("space-y-2 text-sm")}>
                <span className={clsx("block")}>Custom colour</span>
                <input type="color" value={color} onChange={(event) => chooseColor(event.target.value)} className={clsx("block h-10 w-16 cursor-pointer rounded-md", "border border-ink/20 bg-surface p-1")} />
              </label>
              {["Red", "Green", "Blue"].map((channel, index) => (
                <label key={channel} className={clsx("min-w-0 flex-1 space-y-2 text-sm")}>
                  <span className={clsx("block")}>{channel}</span>
                  <input type="number" min={0} max={255} step={1} required value={rgbDraft[index] ?? Number.parseInt(color.slice(1 + index * 2, 3 + index * 2), 16)} onChange={(event) => {
                    setRgbDraft({ ...rgbDraft, [index]: event.target.value });
                    if (!event.target.validity.valid) return;
                    const value = event.target.valueAsNumber.toString(16).padStart(2, "0");
                    setColor(`${color.slice(0, 1 + index * 2)}${value}${color.slice(3 + index * 2)}`);
                  }} className={clsx("h-10 w-full min-w-0 rounded-md", "border border-ink/20 bg-surface", "px-2 text-sm")} />
                </label>
              ))}
            </div>
          </fieldset>
        </fieldset>
        {error && <BodyText role="alert" tone="error" className={clsx("mt-4")}>{error}</BodyText>}
        <div className={clsx("mt-8 flex justify-end gap-3 border-t border-ink/10 pt-5")}>
          <button type="button" disabled={busy || uploading} onClick={close} className={clsx("rounded-md border border-ink/15 px-4 py-2 text-sm font-medium", "hover:bg-ink/5")}>Cancel</button>
          <button type="submit" disabled={busy || uploading} className={clsx("rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action", "hover:bg-action/85")}>{busy ? "Saving…" : course ? "Save changes" : "Create course"}</button>
        </div>
      </form>
      </>}
    </Dialog>
  );
}
