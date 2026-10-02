import clsx from "clsx";
import { useEffect, useState, type FormEvent } from "react";

import CourseIcon, { courseColors } from "../../../shared/ui/CourseIcon";
import Dialog from "../../../shared/ui/Dialog";
import { TextArea, TextInput } from "../../../shared/ui/Input";
import { BodyText, Typography } from "../../../shared/ui/Typography";
import { getProfiles } from "../../ai-profiles/lib/profile/actions";
import type { AiProfile } from "../../ai-profiles/lib/profile/types";
import { createCourse, updateCourse } from "../lib/course/actions";
import type { Course } from "../lib/course/types";
import CoverPicker, { saveWithCover, type CoverChoice } from "./CoverPicker";
import IconPicker from "./IconPicker";

export default function CourseForm({
  course,
  onSave,
  onClose
}: Readonly<{
  course?: Course;
  onSave: (course: Course) => void;
  onClose: () => void;
}>) {
  const [name, setName] = useState(course?.name ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [icon, setIcon] = useState(course?.icon ?? "book");
  const [color, setColor] = useState(course?.color ?? courseColors[0].value);
  const [aiProfileId, setAiProfileId] = useState(course?.ai_profile_id ?? null);
  const [cover, setCover] = useState<CoverChoice>({ reference: course?.cover ?? null, file: null });
  const [details, setDetails] = useState({
    code: course?.code ?? "",
    semester: course?.semester ?? "",
    school: course?.school ?? "",
    instructor: course?.instructor ?? ""
  });
  const [profiles, setProfiles] = useState<AiProfile[]>([]);
  const [rgbDraft, setRgbDraft] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getProfiles().then(setProfiles, () => setProfiles([]));
  }, []);

  function chooseColor(value: string) {
    setColor(value);
    setRgbDraft({});
  }

  async function save(event: FormEvent<HTMLFormElement>, complete: (callback: () => void) => void) {
    event.preventDefault();
    if (busy || uploading) return;
    if (!name.trim()) {
      setError("Enter a course name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await saveWithCover(cover, (reference) => {
        const input = {
          name,
          description,
          icon,
          color,
          ai_profile_id: aiProfileId,
          cover: reference,
          ...details
        };
        return course ? updateCourse(course.id, input) : createCourse(input);
      });
      complete(() => onSave(saved));
    } catch {
      setError("Couldn’t save the course. Your changes are still here. Try again.");
      setBusy(false);
    }
  }

  return (
    <Dialog
      title={course ? "Edit course" : "Create course"}
      onClose={onClose}
      busy={busy || uploading}
    >
      {(close, complete) => (
        <>
          <form onSubmit={(event) => save(event, complete)}>
            <fieldset disabled={busy || uploading} className={clsx("space-y-5")}>
              <div className={clsx("flex items-center gap-4")}>
                <CourseIcon icon={icon} color={color} large />
                <BodyText tone="muted">Give your course a name and a little character.</BodyText>
              </div>
              <TextInput
                label="Course name"
                autoFocus
                required
                name="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Introduction to psychology"
              />
              <TextArea
                label="Description"
                name="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What will you explore in this course?"
              />
              <fieldset>
                <Typography as="legend" variant="label">
                  Details
                </Typography>
                <BodyText tone="muted" className={clsx("mt-1")}>
                  Optional. Shown under the course name.
                </BodyText>
                <div className={clsx("mt-3 grid gap-4 sm:grid-cols-2")}>
                  <TextInput
                    label="Course code"
                    name="code"
                    value={details.code}
                    onChange={(event) => setDetails({ ...details, code: event.target.value })}
                    placeholder="e.g. PSY101"
                  />
                  <TextInput
                    label="Semester"
                    name="semester"
                    value={details.semester}
                    onChange={(event) => setDetails({ ...details, semester: event.target.value })}
                    placeholder="e.g. Semester 1, 2026"
                  />
                  <TextInput
                    label="University or school"
                    name="school"
                    value={details.school}
                    onChange={(event) => setDetails({ ...details, school: event.target.value })}
                    placeholder="e.g. University of Melbourne"
                  />
                  <TextInput
                    label="Instructor"
                    name="instructor"
                    value={details.instructor}
                    onChange={(event) => setDetails({ ...details, instructor: event.target.value })}
                    placeholder="e.g. Dr Jane Lee"
                  />
                </div>
              </fieldset>
              <CoverPicker value={cover} onChange={setCover} />
              {profiles.length > 0 && (
                <fieldset>
                  <Typography as="legend" variant="label" className={clsx("mb-1")}>
                    AI profile
                  </Typography>
                  {[null, ...profiles].map((profile) => (
                    <label
                      key={profile?.id ?? "default"}
                      className={clsx("flex cursor-pointer items-center gap-3 py-1.5 text-sm")}
                    >
                      <input
                        type="radio"
                        name="aiProfile"
                        checked={aiProfileId === (profile?.id ?? null)}
                        onChange={() => setAiProfileId(profile?.id ?? null)}
                        className={clsx("accent-current")}
                      />
                      {profile ? profile.name : "Use the default profile"}
                    </label>
                  ))}
                </fieldset>
              )}
              <IconPicker
                value={icon}
                onChange={(value) => setIcon(value ?? "book")}
                color={color}
                onBusyChange={setUploading}
              />
              <fieldset>
                <Typography as="legend" variant="label" className={clsx("mb-3")}>
                  Colour
                </Typography>
                <div className={clsx("flex flex-wrap gap-3")}>
                  {courseColors.map((value) => (
                    <label
                      key={value.value}
                      title={value.name}
                      className={clsx(
                        "relative size-7 cursor-pointer rounded-full",
                        "border border-ink/40",
                        "has-checked:ring-2 has-checked:ring-ink has-checked:ring-offset-2 has-checked:ring-offset-surface has-focus-visible:outline-1 has-focus-visible:outline-offset-4"
                      )}
                      style={{ backgroundColor: value.value }}
                    >
                      <input
                        type="radio"
                        name="color"
                        value={value.value}
                        checked={color === value.value}
                        onChange={() => chooseColor(value.value)}
                        className={clsx("sr-only")}
                        aria-label={value.name}
                      />
                    </label>
                  ))}
                </div>
                <div className={clsx("mt-4 flex items-end gap-3")}>
                  <label className={clsx("space-y-2 text-sm")}>
                    <span className={clsx("block")}>Custom colour</span>
                    <input
                      type="color"
                      value={color}
                      onChange={(event) => chooseColor(event.target.value)}
                      className={clsx(
                        "block h-10 w-16 cursor-pointer rounded-md",
                        "border border-ink/20 bg-surface p-1"
                      )}
                    />
                  </label>
                  {["Red", "Green", "Blue"].map((channel, index) => (
                    <label key={channel} className={clsx("min-w-0 flex-1 space-y-2 text-sm")}>
                      <span className={clsx("block")}>{channel}</span>
                      <input
                        type="number"
                        min={0}
                        max={255}
                        step={1}
                        required
                        value={
                          rgbDraft[index] ??
                          Number.parseInt(color.slice(1 + index * 2, 3 + index * 2), 16)
                        }
                        onChange={(event) => {
                          setRgbDraft({ ...rgbDraft, [index]: event.target.value });
                          if (!event.target.validity.valid) return;
                          const value = event.target.valueAsNumber.toString(16).padStart(2, "0");
                          setColor(
                            `${color.slice(0, 1 + index * 2)}${value}${color.slice(3 + index * 2)}`
                          );
                        }}
                        className={clsx(
                          "h-10 w-full min-w-0 rounded-md",
                          "border border-ink/20 bg-surface",
                          "px-2 text-sm"
                        )}
                      />
                    </label>
                  ))}
                </div>
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
                {busy ? "Saving…" : course ? "Save changes" : "Create course"}
              </button>
            </div>
          </form>
        </>
      )}
    </Dialog>
  );
}
