import { readArticle } from "@/features/courses/lib/article-import";
import { classifyWithAi } from "@/features/courses/lib/classify-with-ai";
import { detectContent, kindPageTypes } from "@/features/courses/lib/content-detection";
import {
  parseImportFile,
  pastedImport,
  fileImportKind,
  IMPORTABLE_FILE_EXTENSIONS
} from "@/features/courses/lib/file-import";
import { saveMediaImport } from "@/features/courses/lib/import-media";
import { importFiles, saveImport, type ImportStatus } from "@/features/courses/lib/import-save";
import {
  fetchLmsPage,
  isSignInPage,
  knownJsRenderedHost,
  parseLmsPage,
  storePageImages,
  type ParsedImport
} from "@/features/courses/lib/lms-import";
import { pageTypeOptions } from "@/features/courses/lib/page-type/pageTypesState";
import { type Page } from "@/features/courses/lib/page/types";
import {
  closeSchoolBrowser,
  downloadSchoolImage,
  enableImport,
  getSchoolSite,
  openSchoolBrowser,
  putSchoolSite,
  readSchoolPage,
  schoolBrowserAvailable,
  schoolBrowserKnownAvailable,
  watchSchoolBrowser
} from "@/features/courses/lib/school-browser";
import { ApiError } from "@/shared/lib/api";
import { useResetOnOpen } from "@/shared/lib/dialogState";
import { errorMessage } from "@/shared/lib/errorMessage";
import { pickFiles } from "@/shared/lib/pickFiles";
import Dialog from "@/shared/ui/Dialog";
import { TextInput } from "@/shared/ui/Input";
import Select from "@/shared/ui/Select";
import { BodyText, Caption, Typography } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect, useState, type ClipboardEvent, type DragEvent, type FormEvent } from "react";

import ImportBatch, { mediaNote } from "./ImportBatch";
import ImportFileSlot from "./ImportFileSlot";
import ImportFindings, { pickAll, pickedValues, type Findings } from "./ImportFindings";
import ImportProgress from "./ImportProgress";
import KindGuess, { type Guess } from "./KindGuess";

type Source = "url" | "file";

const noFindings: Findings = { dueDates: [], activities: [], files: [] };

const readingStages: Record<Source, string[]> = {
  url: [
    "Connecting to the page…",
    "Downloading the page…",
    "Reading the content…",
    "Finding activities, due dates and files…"
  ],
  file: [
    "Opening the file…",
    "Reading the text and pictures…",
    "Laying out headings, lists and tables…",
    "Finding activities, due dates and files…"
  ]
};
const savingStages = ["Saving the page…", "Adding it to the module…"];
const schoolStages = ["Reading the page…", "Finding activities, due dates and files…"];
const signInNeeded = "This page needs you to sign in. Use Sign in to your school site below.";

void schoolBrowserAvailable();

function submitLabel(source: Source, fileCount: number, busy: boolean) {
  if (busy) return "Reading…";
  if (source === "url") return "Fetch page";
  return fileCount > 1 ? `Import ${fileCount} files` : "Read file";
}

function isHttpUrl(value: string) {
  try {
    return /^https?:$/.test(new URL(value.trim()).protocol);
  } catch {
    return false;
  }
}

export default function LmsImportForm({
  open,
  courseId,
  moduleId,
  initialSource = "url",
  initialFiles,
  onImported,
  onClose
}: Readonly<{
  open: boolean;
  courseId: number;
  moduleId: number;
  initialSource?: Source;
  initialFiles?: File[];
  onImported: (pages: Page[]) => void;
  onClose: () => void;
}>) {
  const [source, setSource] = useState<Source>(initialSource);
  const [url, setUrl] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [importSource, setImportSource] = useState<string | null>(null);
  const [pasted, setPasted] = useState(false);
  const [windowOffer, setWindowOffer] = useState<string | null>(null);
  const [batch, setBatch] = useState<ImportStatus[] | null>(null);
  const [fetched, setFetched] = useState<ParsedImport | null>(null);
  const [findings, setFindings] = useState<Findings>(noFindings);
  const [guess, setGuess] = useState<Guess>();
  const [asking, setAsking] = useState(false);
  const [saved, setSaved] = useState<{ done: number; total: number }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [schoolAvailable, setSchoolAvailable] = useState(schoolBrowserKnownAvailable);
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [fromSchool, setFromSchool] = useState(false);
  const [importedTitles, setImportedTitles] = useState<string[]>([]);
  useResetOnOpen(open, () => {
    setSource(initialFiles?.length ? "file" : initialSource);
    setUrl("");
    setFiles([]);
    setImportSource(null);
    setPasted(false);
    setWindowOffer(null);
    setBatch(null);
    setFetched(null);
    setFindings(noFindings);
    setGuess(undefined);
    setAsking(false);
    setSaved(undefined);
    setBusy(false);
    setError("");
    setDragActive(false);
    setFromSchool(false);
    setImportedTitles([]);
    if (initialFiles?.length) takeFiles(initialFiles);
  });

  useEffect(() => {
    if (!open) setSchoolOpen(false);
  }, [open]);

  useEffect(() => {
    void schoolBrowserAvailable().then(setSchoolAvailable);
  }, []);

  useEffect(() => {
    if (!schoolOpen) return;
    async function importFromSchool() {
      setBusy(true);
      setError("");
      void enableImport(false);
      try {
        const page = await readSchoolPage();
        const parsed = parseLmsPage(page.html, page.url);
        if (!parsed.html)
          throw new Error(
            "Couldn’t find any content on this page. Go to the page itself, then try again."
          );
        preview(parsed, page.url);
        setImportSource(page.url);
        setFromSchool(true);
      } catch (caught) {
        setError(
          errorMessage(
            caught,
            "Couldn’t read this page. Wait for it to finish loading, then try again."
          )
        );
        void enableImport(true);
      }
      setBusy(false);
    }
    const stop = watchSchoolBrowser({
      onImport: () => void importFromSchool(),
      onClose: () => setSchoolOpen(false)
    });
    return () => {
      stop();
      void closeSchoolBrowser();
    };
  }, [schoolOpen]);

  async function openInWindow(address: string) {
    setError("");
    try {
      await openSchoolBrowser(address);
      setWindowOffer(null);
      setSchoolOpen(true);
    } catch (caught) {
      setError(errorMessage(caught, "Couldn’t open the browser window. Try again."));
    }
  }

  async function signIn() {
    setError("");
    const typed = isHttpUrl(url) ? url.trim() : "";
    const saved = await getSchoolSite().catch(() => null);
    const address = typed || saved;
    if (!address) {
      setError("Enter your school site’s address in Page URL, then sign in.");
      return;
    }
    try {
      if (typed && !saved) await putSchoolSite(new URL(typed).origin);
      await openSchoolBrowser(address);
      setSchoolOpen(true);
    } catch (caught) {
      setError(errorMessage(caught, "Couldn’t open the school window. Try again."));
    }
  }

  function preview(parsed: ParsedImport, sourceUrl?: string) {
    const found = detectContent(parsed.title, parsed.html, { url: sourceUrl });
    setFetched({ ...parsed, type: kindPageTypes[found.kind] });
    setGuess({ kind: found.kind, sure: found.sure });
    setFindings({
      dueDates: pickAll(found.dueDates),
      activities: pickAll(found.activities),
      files: pickAll(found.files)
    });
  }

  async function askAi() {
    if (!fetched || asking) return;
    setAsking(true);
    setError("");
    try {
      const kind = await classifyWithAi(fetched.title, fetched.html);
      setGuess({ kind, sure: true, byAi: true });
      setFetched({ ...fetched, type: kindPageTypes[kind] });
    } catch (error_) {
      setError(errorMessage(error_, "Couldn’t ask the AI. Choose the type yourself."));
    }
    setAsking(false);
  }

  function backToSchool() {
    setFetched(null);
    setFromSchool(false);
    void enableImport(true);
  }

  async function chooseFile() {
    try {
      const picked = await pickFiles({ extensions: IMPORTABLE_FILE_EXTENSIONS, multiple: true });
      if (!picked.length) return;
      setError("");
      setFiles(picked);
    } catch (error_) {
      setError(errorMessage(error_, "Couldn’t open the file picker. Try again."));
    }
  }

  function takeFiles(chosen: File[]) {
    const skipped = chosen.filter((item) => !fileImportKind(item)).map((item) => `“${item.name}”`);
    setError(
      skipped.length
        ? `Can’t import ${skipped.join(", ")}. Choose PDF, Word, Markdown or text files, pictures, audio or video.`
        : ""
    );
    const importable = chosen.filter((item) => fileImportKind(item));
    if (importable.length) setFiles(importable);
  }

  function switchSource(next: Source) {
    setSource(next);
    setError("");
    setWindowOffer(null);
  }

  function handlePaste(event: ClipboardEvent<HTMLFormElement>) {
    if (busy) return;
    const picture = Array.from(event.clipboardData.files).find((item) =>
      item.type.startsWith("image/")
    );
    if (picture) {
      event.preventDefault();
      const stamp = new Date()
        .toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
        .replace(/[/:]/g, ".");
      setFiles([
        new File([picture], `Pasted picture ${stamp}.${picture.type.split("/")[1] || "png"}`, {
          type: picture.type
        })
      ]);
      setSource("file");
      setError("");
      return;
    }
    if (event.target instanceof HTMLInputElement) return;
    const text = event.clipboardData.getData("text/plain").trim();
    if (!text) return;
    event.preventDefault();
    setError("");
    if (isHttpUrl(text)) {
      setSource("url");
      setUrl(text);
      return;
    }
    preview(pastedImport(text, event.clipboardData.getData("text/html")));
    setImportSource(null);
    setPasted(true);
  }

  async function runBatch() {
    setBatch(files.map(() => ({ state: "waiting" })));
    await importFiles(
      files,
      courseId,
      moduleId,
      (index, status) =>
        setBatch(
          (current) =>
            current?.map((item, itemIndex) => (itemIndex === index ? status : item)) ?? null
        ),
      (page) => onImported([page])
    );
    setBusy(false);
  }

  function handleDragOver(event: DragEvent<HTMLFormElement>) {
    if (busy || fetched) return;
    event.preventDefault();
    setDragActive(true);
  }

  function handleDrop(event: DragEvent<HTMLFormElement>) {
    event.preventDefault();
    setDragActive(false);
    if (busy || fetched) return;
    const dropped = Array.from(event.dataTransfer.files);
    if (!dropped.length) return;
    setSource("file");
    takeFiles(dropped);
  }

  async function fetchAndParse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setWindowOffer(null);
    const address = url.trim();
    try {
      let parsed: ParsedImport;
      if (source === "url") {
        if (schoolAvailable && isHttpUrl(address) && knownJsRenderedHost(address)) {
          setError(
            `${knownJsRenderedHost(address)} builds its pages with JavaScript, so mneme reads it in a browser window.`
          );
          setWindowOffer(address);
          setBusy(false);
          return;
        }
        const html = await fetchLmsPage(url);
        if (schoolAvailable && isSignInPage(html)) throw new Error(signInNeeded);
        parsed = readArticle(html, address) ?? parseLmsPage(html, address);
      } else {
        if (!files.length) throw new Error("Choose a file to import.");
        if (files.length > 1) {
          await runBatch();
          return;
        }
        parsed = await parseImportFile(files[0]);
      }
      setImportSource(source === "url" ? address : files[0].name);
      setPasted(false);
      if (parsed.media) {
        setFetched(parsed);
        setGuess(undefined);
        setFindings(noFindings);
        setBusy(false);
        return;
      }
      if (!parsed.html) {
        setError(
          schoolAvailable && source === "url"
            ? "Couldn’t find any content there. It may build its page with JavaScript: open it in a browser window and import what it shows."
            : "Couldn’t find any content there. If it’s a page that loads its content with JavaScript (an app-like site rather than a plain document), this import can’t read it."
        );
        if (schoolAvailable && source === "url") setWindowOffer(address);
        setBusy(false);
        return;
      }
      preview(parsed, source === "url" ? address : undefined);
      setBusy(false);
    } catch (caught) {
      const needsSignIn =
        schoolAvailable &&
        caught instanceof ApiError &&
        (caught.status === 401 || caught.status === 403);
      setError(
        needsSignIn ? signInNeeded : errorMessage(caught, "Couldn’t import that. Try again.")
      );
      setBusy(false);
    }
  }

  async function importPage(complete: (callback: () => void) => void) {
    if (!fetched || busy) return;
    if (!fetched.title.trim()) {
      setError("Enter a page title.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (fetched.media) {
        const page = await saveMediaImport({
          courseId,
          moduleId,
          title: fetched.title,
          type: fetched.type,
          media: fetched.media
        });
        complete(() => {
          onImported([page]);
          onClose();
        });
        return;
      }
      const html =
        source === "url" || pasted
          ? await storePageImages(
              fetched.html,
              (done, total) => setSaved({ done, total }),
              fromSchool ? downloadSchoolImage : undefined
            )
          : fetched.html;
      setSaved(undefined);
      const picked = {
        dueDates: pickedValues(findings.dueDates),
        activities: pickedValues(findings.activities),
        files: pickedValues(findings.files)
      };
      const page = await saveImport({
        courseId,
        moduleId,
        parsed: { ...fetched, html },
        findings: picked,
        kind: guess?.kind,
        source: importSource
      });
      if (fromSchool) {
        onImported([page]);
        setImportedTitles([...importedTitles, page.title]);
        setBusy(false);
        backToSchool();
        return;
      }
      complete(() => {
        onImported([page]);
        onClose();
      });
    } catch {
      setError("Couldn’t create this page. Try again.");
      setSaved(undefined);
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} title="Import" onClose={onClose} busy={busy}>
      {(close, complete) =>
        batch ? (
          <div>
            <ImportBatch
              names={files.map((file) => file.name)}
              statuses={batch}
              note={mediaNote(files)}
            />
            <div className={clsx("mt-8 flex justify-end gap-3 border-t border-ink/10 pt-5")}>
              <button
                type="button"
                disabled={busy}
                onClick={close}
                className={clsx(
                  "rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action",
                  "hover:bg-action/85 disabled:opacity-50"
                )}
              >
                Done
              </button>
            </div>
          </div>
        ) : fetched === null && schoolOpen ? (
          <div>
            <BodyText>
              In the window beside mneme, sign in if the site asks, go to the page you want, then
              press <strong className={clsx("font-medium")}>Import this page</strong> there.
            </BodyText>
            {importedTitles.length > 0 && (
              <div className={clsx("mt-5")}>
                <Typography as="h3" variant="label">
                  Imported to this module
                </Typography>
                <ul className={clsx("mt-2 divide-y divide-ink/10 rounded-md border border-ink/15")}>
                  {importedTitles.map((title, index) => (
                    <li
                      key={`${index}-${title}`}
                      className={clsx("px-3 py-2 text-sm wrap-anywhere")}
                    >
                      {title}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {busy && <ImportProgress stages={schoolStages} />}
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
                Close school window
              </button>
            </div>
          </div>
        ) : fetched === null ? (
          <form
            onSubmit={fetchAndParse}
            onDragOver={handleDragOver}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            onPaste={handlePaste}
          >
            <div
              role="group"
              aria-label="Import from"
              className={clsx("flex rounded-md border border-ink/20 p-1")}
            >
              <button
                type="button"
                disabled={busy}
                onClick={() => switchSource("url")}
                className={clsx(
                  "flex-1 rounded-md py-1.5 text-sm font-medium",
                  source === "url" ? "bg-ink/10 text-ink" : "text-muted hover:text-ink"
                )}
              >
                From a link
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => switchSource("file")}
                className={clsx(
                  "flex-1 rounded-md py-1.5 text-sm font-medium",
                  source === "file" ? "bg-ink/10 text-ink" : "text-muted hover:text-ink"
                )}
              >
                From files
              </button>
            </div>
            <div
              className={clsx(
                "mt-5 rounded-md border-2 border-dashed p-4 transition-colors motion-reduce:transition-none",
                dragActive && source === "url" ? "border-action bg-action/5" : "border-transparent"
              )}
            >
              <fieldset disabled={busy} className={clsx("min-w-0 space-y-5")}>
                {source === "url" ? (
                  <TextInput
                    label="Page URL"
                    autoFocus
                    data-autofocus
                    required
                    type="url"
                    name="url"
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    placeholder="https://school.edu/course/module/123"
                    hint={
                      schoolAvailable
                        ? "A course page, an article or any website. For pages that need a login, sign in to your school site."
                        : "A public course page, an article or any website. Pages that require login aren’t supported yet."
                    }
                  />
                ) : (
                  <ImportFileSlot
                    files={files}
                    dragging={dragActive}
                    disabled={busy}
                    onChoose={() => void chooseFile()}
                    onRemove={(removed) => setFiles(files.filter((item) => item !== removed))}
                  />
                )}
              </fieldset>
              {source === "url" && schoolAvailable && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void signIn()}
                  className={clsx(
                    "mt-3 text-sm font-medium underline underline-offset-4",
                    "hover:text-muted"
                  )}
                >
                  Sign in to your school site
                </button>
              )}
              {source === "url" && (
                <Caption tone="muted" className={clsx("mt-3 text-center")}>
                  {dragActive
                    ? "Drop to import the file instead"
                    : "Drag files in, or paste a picture or text with ⌘V"}
                </Caption>
              )}
            </div>
            {busy && <ImportProgress stages={readingStages[source]} />}
            {error && (
              <BodyText role="alert" tone="error" className={clsx("mt-4")}>
                {error}
              </BodyText>
            )}
            {windowOffer && (
              <button
                type="button"
                onClick={() => void openInWindow(windowOffer)}
                className={clsx(
                  "mt-3 text-sm font-medium underline underline-offset-4",
                  "hover:text-muted"
                )}
              >
                Open in a browser window
              </button>
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
                {submitLabel(source, files.length, busy)}
              </button>
            </div>
          </form>
        ) : (
          <div>
            <fieldset disabled={busy} className={clsx("space-y-5")}>
              <TextInput
                label="Page title"
                autoFocus
                data-autofocus
                required
                name="title"
                value={fetched.title}
                onChange={(event) => setFetched({ ...fetched, title: event.target.value })}
              />
              <Select
                label="Type"
                value={fetched.type}
                onChange={(value) => setFetched({ ...fetched, type: value })}
                options={pageTypeOptions()}
              />
              {guess && <KindGuess guess={guess} asking={asking} onAskAi={() => void askAi()} />}
              <ImportFindings findings={findings} onChange={setFindings} />
            </fieldset>
            {busy && <ImportProgress stages={savingStages} saved={saved} />}
            {error && (
              <BodyText role="alert" tone="error" className={clsx("mt-4")}>
                {error}
              </BodyText>
            )}
            <div className={clsx("mt-8 flex justify-end gap-3 border-t border-ink/10 pt-5")}>
              <button
                type="button"
                disabled={busy}
                onClick={() => (fromSchool ? backToSchool() : setFetched(null))}
                className={clsx(
                  "rounded-md border border-ink/15 px-4 py-2 text-sm font-medium",
                  "hover:bg-ink/5"
                )}
              >
                Back
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => importPage(complete)}
                className={clsx(
                  "rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action",
                  "hover:bg-action/85"
                )}
              >
                {busy ? "Importing…" : "Import page"}
              </button>
            </div>
          </div>
        )
      }
    </Dialog>
  );
}
