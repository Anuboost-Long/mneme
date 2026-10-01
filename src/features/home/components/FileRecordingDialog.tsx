import clsx from "clsx";
import { useState } from "react";
import { Link } from "react-router-dom";

import { errorMessage } from "../../../shared/lib/errorMessage";
import { formatDuration } from "../../../shared/lib/formatDuration";
import Dialog from "../../../shared/ui/Dialog";
import { TextInput } from "../../../shared/ui/Input";
import { BodyText, Caption, Typography } from "../../../shared/ui/Typography";
import { escapeHtml } from "../../ai-actions/lib/editorHtml";
import { getModuleDestinations } from "../../courses/lib/modules";
import { appendToPage, createPage, erasePages, PageType, searchPageLinks } from "../../courses/lib/pages";
import Select from "../../../shared/ui/Select";
import { createRecording, renameRecording } from "../../courses/lib/recordings";
import { transcribeError, transcribeRecording } from "../../courses/lib/transcription";
import { getPages } from "../lib/dashboard";
import { useWidgetData } from "../lib/useWidgetData";
import { pageLink } from "../widgets/parts";

export type Take = { audio: Blob; durationMs: number };

type Target = { id: number; title: string; module_id: number; course_id: number; where: string };

type Stage =
  | { name: "choosing" }
  | { name: "saving" }
  | { name: "transcribing"; progress: number }
  | { name: "done"; page: Target; transcript: "none" | "added" | "silent" }
  | { name: "failed"; page: Target; message: string };

const defaultName = () => `Recording ${new Date().toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`;

// Files a take recorded on Home: the recording goes at the end of the
// chosen page, and with "Transcribe" its transcript follows it there. The
// audio is saved before transcribing, so a failed transcription loses
// nothing: the page's recording can be transcribed again.
export default function FileRecordingDialog({ take, onFiled, onClose }: Readonly<{
  take: Take;
  onFiled: () => void;
  onClose: () => void;
}>) {
  const [destination, setDestination] = useState<"existing" | "new">("existing");
  const [moduleId, setModuleId] = useState(0);
  const [pageTitle, setPageTitle] = useState("");
  const modules = useWidgetData(getModuleDestinations, "modules");
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState<Target | null>(null);
  const [name, setName] = useState(defaultName);
  const [stage, setStage] = useState<Stage>({ name: "choosing" });
  const [error, setError] = useState<string | null>(null);

  const matches = useWidgetData(async (): Promise<Target[]> => {
    if (query.trim()) {
      const pages = await searchPageLinks(query, 8);
      return pages.map((page) => ({ id: page.id, title: page.title, module_id: page.module_id, course_id: page.course_id, where: page.module_name }));
    }
    const recent = await getPages({}, "opened", 6);
    return recent.map((page) => ({ id: page.id, title: page.title, module_id: page.module_id, course_id: page.course_id, where: `${page.course_name} · ${page.module_name}` }));
  }, query);
  const chosen = target ?? (query.trim() ? null : matches?.[0]) ?? null;
  // A new page goes in the module of the page opened last, unless changed.
  const module = modules?.find((item) => item.id === moduleId) ?? modules?.find((item) => item.id === matches?.[0]?.module_id) ?? modules?.[0];

  async function destinationPage(): Promise<Target | null> {
    if (destination === "existing") return chosen;
    if (!module) return null;
    const page = await createPage(module.id, { title: pageTitle.trim() || name.trim() || defaultName(), type: PageType.Lecture });
    return { id: page.id, title: page.title, module_id: module.id, course_id: module.course_id, where: `${module.course_name} · ${module.name}` };
  }

  async function file(transcribe: boolean) {
    if (destination === "existing" ? !chosen : !module) {
      setError(destination === "existing" ? "Choose the page to save this recording on." : "Create a module first; a new page needs one to go in.");
      return;
    }
    setError(null);
    setStage({ name: "saving" });
    let page: Target | null = null;
    let recordingId: number | null = null;
    try {
      page = await destinationPage();
      if (!page) throw new Error("Couldn’t find where to save the recording.");
      const recording = await createRecording(page.id, take.audio, take.durationMs);
      recordingId = recording.id;
      if (name.trim() && name.trim() !== recording.name) await renameRecording(recording.id, name);
      await appendToPage(page.id, `<div data-recording-id="${recording.id}"></div>`);
      onFiled();
      if (!transcribe) {
        setStage({ name: "done", page, transcript: "none" });
        return;
      }
      setStage({ name: "transcribing", progress: 0 });
      const text = await transcribeRecording(recording, (progress) => setStage({ name: "transcribing", progress }));
      const paragraphs = text.split("\n").map((line) => line.trim()).filter(Boolean);
      if (paragraphs.length) await appendToPage(page.id, paragraphs.map((line) => `<p>${escapeHtml(line)}</p>`).join(""));
      setStage({ name: "done", page, transcript: paragraphs.length > 0 ? "added" : "silent" });
    } catch (error_) {
      if (recordingId !== null && page) {
        setStage({ name: "failed", page, message: transcribeError(error_) });
        return;
      }
      // Nothing was saved; a page made just for this recording goes too.
      if (page && destination === "new") await erasePages("id = ?", [page.id]).catch(() => undefined);
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
                  {stage.name === "done" && stage.transcript === "added" && <>Saved on “{stage.page.title}”, with its transcript underneath.</>}
                  {stage.name === "done" && stage.transcript === "silent" && <>Saved on “{stage.page.title}”. No speech was found in it, so there’s no transcript.</>}
                  {stage.name === "done" && stage.transcript === "none" && <>Saved on “{stage.page.title}”.</>}
                  {stage.name === "failed" && <>The recording is saved on “{stage.page.title}”, but it couldn’t be transcribed: {stage.message} You can transcribe it from the page.</>}
                </BodyText>
                <div className={clsx("flex justify-end gap-3")}>
                  <button type="button" onClick={close} className={clsx("rounded-md border border-ink/15 px-4 py-2 text-sm", "hover:bg-ink/5")}>Close</button>
                  <Link to={pageLink(stage.page)} className={clsx("rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action", "hover:bg-action/85")}>Open page</Link>
                </div>
              </div>
            );
          case "saving":
          case "transcribing":
            return (
              <div className={clsx("space-y-3")} aria-live="polite">
                <BodyText>{stage.name === "saving" ? "Saving the recording…" : `Transcribing… ${Math.round(stage.progress * 100)}%`}</BodyText>
                <progress value={stage.name === "saving" ? undefined : stage.progress} max={1} aria-label="Progress" className={clsx("block h-1 w-full appearance-none overflow-hidden rounded-full bg-ink/10", "[&::-webkit-progress-bar]:bg-ink/10 [&::-webkit-progress-value]:bg-ink/60")} />
                <Caption tone="muted">Transcription runs on this computer; the audio doesn’t leave it.</Caption>
              </div>
            );
          case "choosing":
            return (
              <div className={clsx("space-y-5")}>
                <BodyText tone="muted">{formatDuration(take.durationMs)} recorded. Add it to the end of a page, or start a new page with it.</BodyText>
                <TextInput label="Name" value={name} onChange={(event) => setName(event.target.value)} />
                <fieldset className={clsx("flex gap-1")}>
                  <legend className={clsx("sr-only")}>Save to</legend>
                  {(["existing", "new"] as const).map((option) => (
                    <label
                      key={option}
                      className={clsx(
                        "flex h-8 cursor-pointer items-center rounded-md px-3 text-sm",
                        "border",
                        option === destination ? "border-ink/40 bg-ink/6 font-medium" : "border-ink/15 hover:bg-ink/4",
                        "has-focus-visible:outline-1 has-focus-visible:outline-ink"
                      )}
                    >
                      <input type="radio" name="recording-destination" checked={option === destination} onChange={() => setDestination(option)} className={clsx("sr-only")} />
                      {option === "existing" ? "Existing page" : "New page"}
                    </label>
                  ))}
                </fieldset>
                {destination === "new" ? (
                  <div className={clsx("space-y-4")}>
                    {modules && modules.length > 0 && module ? (
                      <Select label="Module" value={module.id} onChange={setModuleId} options={modules.map((item) => ({ value: item.id, label: `${item.course_name} › ${item.name}` }))} />
                    ) : (
                      <BodyText tone="muted">There’s no module to put a new page in yet. Create one in a course first.</BodyText>
                    )}
                    <TextInput label="Page title" value={pageTitle} placeholder={name.trim() || "Lecture recording"} onChange={(event) => setPageTitle(event.target.value)} hint="A Lecture page. Leave empty to use the recording’s name." />
                  </div>
                ) : (
                <fieldset className={clsx("min-w-0 space-y-2")}>
                  <legend><Typography as="span" variant="label">Page</Typography></legend>
                  <input
                    type="search"
                    value={query}
                    placeholder="Search pages…"
                    aria-label="Search pages"
                    onChange={(event) => {
                      setQuery(event.target.value);
                      setTarget(null);
                    }}
                    className={clsx("h-9 w-full rounded-md", "border border-ink/20 bg-surface", "px-3 text-sm placeholder:text-muted", "focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink")}
                  />
                  {!query.trim() && <Caption tone="muted">Recently opened</Caption>}
                  <ul className={clsx("max-h-64 space-y-0.5 overflow-y-auto")}>
                    {matches?.length === 0 && <li className={clsx("px-3 py-2 text-sm text-muted")}>No pages match.</li>}
                    {matches?.map((page) => {
                      const selected = chosen?.id === page.id;
                      return (
                        <li key={page.id}>
                          <label
                            className={clsx(
                              "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2",
                              selected ? "bg-ink/7" : "hover:bg-ink/4",
                              "has-focus-visible:outline-1 has-focus-visible:-outline-offset-1 has-focus-visible:outline-ink"
                            )}
                          >
                            <input type="radio" name="recording-page" checked={selected} onChange={() => setTarget(page)} className={clsx("sr-only")} />
                            <span className={clsx("min-w-0 flex-1")}>
                              <span className={clsx("block truncate text-sm font-medium")}>{page.title}</span>
                              <Caption as="span" tone="muted" className={clsx("block truncate")}>{page.where}</Caption>
                            </span>
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={clsx("shrink-0", !selected && "invisible")}>
                              <path d="m3.5 8.5 3 3 6-7" />
                            </svg>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </fieldset>
                )}
                {error && <BodyText role="alert" tone="error">{error}</BodyText>}
                <div className={clsx("flex flex-wrap items-center gap-3 border-t border-ink/10 pt-4")}>
                  <button type="button" onClick={close} className={clsx("mr-auto rounded-md px-2 py-2 text-sm text-muted", "hover:text-ink focus-visible:outline-1 focus-visible:outline-ink")}>Not now</button>
                  <button type="button" onClick={() => void file(false)} className={clsx("rounded-md border border-ink/15 px-4 py-2 text-sm font-medium", "hover:bg-ink/5")}>Save to page</button>
                  <button type="button" onClick={() => void file(true)} className={clsx("rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action", "hover:bg-action/85")}>Transcribe into page</button>
                </div>
              </div>
            );
        }
      }}
    </Dialog>
  );
}
