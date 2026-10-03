import clsx from "clsx";
import { useState } from "react";
import { Link } from "react-router-dom";

import { errorMessage } from "../../../shared/lib/errorMessage";
import { formatDuration } from "../../../shared/lib/formatDuration";
import Dialog from "../../../shared/ui/Dialog";
import { TextInput } from "../../../shared/ui/Input";
import Select from "../../../shared/ui/Select";
import { BodyText, Caption } from "../../../shared/ui/Typography";
import { getModuleDestinations } from "../../courses/lib/module/actions";
import { appendToPage, createPage, erasePage } from "../../courses/lib/page/actions";
import { PageType } from "../../courses/lib/page/types";
import { createRecording, renameRecording } from "../../courses/lib/recording/actions";
import { transcriptHtml } from "../../courses/lib/recording/types";
import { transcribeError, transcribeRecording } from "../../courses/lib/transcription";
import { useWidgetData } from "../lib/useWidgetData";
import { pageLink } from "../widgets/parts";
import PagePicker, { type PageTarget } from "./PagePicker";

export type Take = { audio: Blob; durationMs: number };

type Destination = "existing" | "new" | "recordings";

type Stage =
  | { name: "choosing" }
  | { name: "saving" }
  | { name: "transcribing"; progress: number }
  | { name: "done"; page: PageTarget | null; transcript: "none" | "added" | "silent" }
  | { name: "failed"; page: PageTarget | null; message: string };

const destinationLabels: Record<Destination, string> = {
  existing: "Existing page",
  new: "New page",
  recordings: "Recordings only"
};

const defaultName = () =>
  `Recording ${new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`;

// Files a take recorded on Home: the recording goes at the end of the
// chosen page, and with "Transcribe" its transcript follows it there. The
// audio is saved before transcribing, so a failed transcription loses
// nothing: the page's recording can be transcribed again.
export default function FileRecordingDialog({
  take,
  onFiled,
  onClose
}: Readonly<{
  take: Take;
  onFiled: () => void;
  onClose: () => void;
}>) {
  const [destination, setDestination] = useState<Destination>("existing");
  const [moduleId, setModuleId] = useState(0);
  const [pageTitle, setPageTitle] = useState("");
  const modules = useWidgetData(getModuleDestinations, "modules");
  const [target, setTarget] = useState<PageTarget | null>(null);
  const [name, setName] = useState(defaultName);
  const [stage, setStage] = useState<Stage>({ name: "choosing" });
  const [error, setError] = useState<string | null>(null);

  // A new page goes in the module of the page opened last, unless changed.
  const module =
    modules?.find((item) => item.id === moduleId) ??
    modules?.find((item) => item.id === target?.module_id) ??
    modules?.[0];

  async function destinationPage(): Promise<PageTarget | null> {
    if (destination === "existing") return target;
    if (!module) return null;
    const page = await createPage(module.id, {
      title: pageTitle.trim() || name.trim() || defaultName(),
      type: PageType.Lecture
    });
    return {
      id: page.id,
      title: page.title,
      module_id: module.id,
      course_id: module.course_id,
      where: `${module.course_name} · ${module.name}`
    };
  }

  async function file(transcribe: boolean) {
    if (destination === "existing" ? !target : destination === "new" && !module) {
      setError(
        destination === "existing"
          ? "Choose the page to save this recording on."
          : "Create a module first; a new page needs one to go in."
      );
      return;
    }
    setError(null);
    setStage({ name: "saving" });
    let page: PageTarget | null = null;
    let recordingId: number | null = null;
    try {
      if (destination !== "recordings") {
        page = await destinationPage();
        if (!page) throw new Error("Couldn’t find where to save the recording.");
      }
      const recording = await createRecording(page?.id ?? null, take.audio, take.durationMs);
      recordingId = recording.id;
      if (name.trim() && name.trim() !== recording.name) await renameRecording(recording.id, name);
      if (page) await appendToPage(page.id, `<div data-recording-id="${recording.id}"></div>`);
      onFiled();
      if (!transcribe) {
        setStage({ name: "done", page, transcript: "none" });
        return;
      }
      setStage({ name: "transcribing", progress: 0 });
      const text = await transcribeRecording(recording, (progress) =>
        setStage({ name: "transcribing", progress })
      );
      const paragraphs = transcriptHtml(text);
      if (page && paragraphs) await appendToPage(page.id, paragraphs);
      setStage({ name: "done", page, transcript: paragraphs ? "added" : "silent" });
    } catch (error_) {
      if (recordingId !== null) {
        setStage({ name: "failed", page, message: transcribeError(error_) });
        return;
      }
      // Nothing was saved; a page made just for this recording goes too.
      if (page && destination === "new") await erasePage(page.id).catch(() => undefined);
      setStage({ name: "choosing" });
      setError(errorMessage(error_, "Couldn’t save the recording. Try again."));
    }
  }

  const busy = stage.name === "saving" || stage.name === "transcribing";

  return (
    <Dialog title="Save recording" busy={busy} onClose={onClose}>
      {(close) => {
        switch (stage.name) {
          case "done":
          case "failed":
            return (
              <div className={clsx("space-y-4")}>
                <BodyText>
                  {stage.name === "done" && stage.transcript === "added" && (
                    <>
                      {stage.page
                        ? `Saved on “${stage.page.title}”, with its transcript underneath.`
                        : "Saved to Recordings, with its transcript."}
                    </>
                  )}
                  {stage.name === "done" && stage.transcript === "silent" && (
                    <>
                      {stage.page ? `Saved on “${stage.page.title}”.` : "Saved to Recordings."} No
                      speech was found in it, so there’s no transcript.
                    </>
                  )}
                  {stage.name === "done" && stage.transcript === "none" && (
                    <>
                      {stage.page
                        ? `Saved on “${stage.page.title}”.`
                        : "Saved to Recordings. You can add it to a page from there any time."}
                    </>
                  )}
                  {stage.name === "failed" && (
                    <>
                      The recording is saved{" "}
                      {stage.page ? `on “${stage.page.title}”` : "to Recordings"}, but it couldn’t
                      be transcribed: {stage.message} You can transcribe it from{" "}
                      {stage.page ? "the page" : "Recordings"}.
                    </>
                  )}
                </BodyText>
                <div className={clsx("flex justify-end gap-3")}>
                  <button
                    type="button"
                    onClick={close}
                    className={clsx(
                      "rounded-md border border-ink/15 px-4 py-2 text-sm",
                      "hover:bg-ink/5"
                    )}
                  >
                    Close
                  </button>
                  <Link
                    to={stage.page ? pageLink(stage.page) : "/recordings"}
                    className={clsx(
                      "rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action",
                      "hover:bg-action/85"
                    )}
                  >
                    {stage.page ? "Open page" : "Open Recordings"}
                  </Link>
                </div>
              </div>
            );
          case "saving":
          case "transcribing":
            return (
              <div className={clsx("space-y-3")} aria-live="polite">
                <BodyText>
                  {stage.name === "saving"
                    ? "Saving the recording…"
                    : `Transcribing… ${Math.round(stage.progress * 100)}%`}
                </BodyText>
                <progress
                  value={stage.name === "saving" ? undefined : stage.progress}
                  max={1}
                  aria-label="Progress"
                  className={clsx(
                    "block h-1 w-full appearance-none overflow-hidden rounded-full bg-ink/10",
                    "[&::-webkit-progress-bar]:bg-ink/10 [&::-webkit-progress-value]:bg-ink/60"
                  )}
                />
                <Caption tone="muted">
                  Transcription runs on this computer; the audio doesn’t leave it.
                </Caption>
              </div>
            );
          case "choosing":
            return (
              <div className={clsx("space-y-5")}>
                <BodyText tone="muted">
                  {formatDuration(take.durationMs)} recorded. Add it to the end of a page, start a
                  new page with it, or keep it in Recordings and add it to a page later.
                </BodyText>
                <TextInput
                  label="Name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <fieldset className={clsx("flex flex-wrap gap-1")}>
                  <legend className={clsx("sr-only")}>Save to</legend>
                  {(["existing", "new", "recordings"] as const).map((option) => (
                    <label
                      key={option}
                      className={clsx(
                        "flex h-8 cursor-pointer items-center rounded-md px-3 text-sm",
                        "border",
                        option === destination
                          ? "border-ink/40 bg-ink/6 font-medium"
                          : "border-ink/15 hover:bg-ink/4",
                        "has-focus-visible:outline-1 has-focus-visible:outline-ink"
                      )}
                    >
                      <input
                        type="radio"
                        name="recording-destination"
                        checked={option === destination}
                        onChange={() => setDestination(option)}
                        className={clsx("sr-only")}
                      />
                      {destinationLabels[option]}
                    </label>
                  ))}
                </fieldset>
                {destination === "new" ? (
                  <div className={clsx("space-y-4")}>
                    {modules && modules.length > 0 && module ? (
                      <Select
                        label="Module"
                        value={module.id}
                        onChange={setModuleId}
                        options={modules.map((item) => ({
                          value: item.id,
                          label: `${item.course_name} › ${item.name}`
                        }))}
                      />
                    ) : (
                      <BodyText tone="muted">
                        There’s no module to put a new page in yet. Create one in a course first.
                      </BodyText>
                    )}
                    <TextInput
                      label="Page title"
                      value={pageTitle}
                      placeholder={name.trim() || "Lecture recording"}
                      onChange={(event) => setPageTitle(event.target.value)}
                      hint="A Lecture page. Leave empty to use the recording’s name."
                    />
                  </div>
                ) : (
                  destination === "existing" && (
                    <PagePicker selected={target} onSelect={setTarget} />
                  )
                )}
                {destination === "recordings" && (
                  <Caption tone="muted">
                    It goes on the Recordings screen, where you can play it, transcribe it, and add
                    it to a page whenever you like.
                  </Caption>
                )}
                {error && (
                  <BodyText role="alert" tone="error">
                    {error}
                  </BodyText>
                )}
                <div
                  className={clsx("flex flex-wrap items-center gap-3 border-t border-ink/10 pt-4")}
                >
                  <button
                    type="button"
                    onClick={close}
                    className={clsx(
                      "mr-auto rounded-md px-2 py-2 text-sm text-muted",
                      "hover:text-ink focus-visible:outline-1 focus-visible:outline-ink"
                    )}
                  >
                    Not now
                  </button>
                  <button
                    type="button"
                    onClick={() => void file(false)}
                    className={clsx(
                      "rounded-md border border-ink/15 px-4 py-2 text-sm font-medium",
                      "hover:bg-ink/5"
                    )}
                  >
                    {destination === "recordings" ? "Save" : "Save to page"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void file(true)}
                    className={clsx(
                      "rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action",
                      "hover:bg-action/85"
                    )}
                  >
                    {destination === "recordings" ? "Save and transcribe" : "Transcribe into page"}
                  </button>
                </div>
              </div>
            );
        }
      }}
    </Dialog>
  );
}
