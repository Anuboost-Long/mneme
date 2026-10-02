import { useState, type DragEvent, type FormEvent } from "react";
import clsx from "clsx";
import { fetchLmsPage, parseLmsPage, storePageImages, type ParsedImport } from "../lib/lms-import";
import { parseImportFile, fileImportKind, IMPORTABLE_FILE_EXTENSIONS } from "../lib/file-import";
import { pageTypes, type Page } from "../lib/page/types";
import { createPage } from "../lib/page/actions";
import ImportFileSlot from "./ImportFileSlot";
import { pageTypeLabels } from "./PageForm";
import Dialog from "../../../shared/ui/Dialog";
import { TextInput } from "../../../shared/ui/Input";
import Select from "../../../shared/ui/Select";
import { BodyText, Caption } from "../../../shared/ui/Typography";
import { errorMessage } from "../../../shared/lib/errorMessage";
import { pickFiles } from "../../../shared/lib/pickFiles";

type Source = "url" | "file";


export default function LmsImportForm({ moduleId, initialSource = "url", onImported, onClose }: Readonly<{
  moduleId: number;
  initialSource?: Source;
  onImported: (pages: Page[]) => void;
  onClose: () => void;
}>) {
  const [source, setSource] = useState<Source>(initialSource);
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fetched, setFetched] = useState<ParsedImport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  async function chooseFile() {
    try {
      const [picked] = await pickFiles({ extensions: IMPORTABLE_FILE_EXTENSIONS });
      if (!picked) return;
      setError("");
      setFile(picked);
    } catch (error_) {
      setError(errorMessage(error_, "Couldn’t open the file picker. Try again."));
    }
  }

  function switchSource(next: Source) {
    setSource(next);
    setError("");
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
    const dropped = event.dataTransfer.files[0];
    if (!dropped) return;
    setSource("file");
    if (!fileImportKind(dropped)) { setError(`Can’t import “${dropped.name}” — choose a .md, .docx, or .pdf file.`); return; }
    setError("");
    setFile(dropped);
  }

  async function fetchAndParse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      let parsed: ParsedImport;
      if (source === "url") {
        const html = await fetchLmsPage(url);
        parsed = parseLmsPage(html, url.trim());
      } else {
        if (!file) throw new Error("Choose a file to import.");
        parsed = await parseImportFile(file);
      }
      if (!parsed.html) { setError("Couldn’t find any content there. If it’s a page that loads its content with JavaScript (an app-like site rather than a plain document), this import can’t read it."); setBusy(false); return; }
      setFetched(parsed);
      setBusy(false);
    } catch (caught) {
      setError(errorMessage(caught, "Couldn’t import that. Try again."));
      setBusy(false);
    }
  }

  async function importPage(complete: (callback: () => void) => void) {
    if (!fetched || busy) return;
    if (!fetched.title.trim()) { setError("Enter a page title."); return; }
    setBusy(true);
    setError("");
    try {
      const content = source === "url" ? await storePageImages(fetched.html) : fetched.html;
      const page = await createPage(moduleId, { title: fetched.title, type: fetched.type, content });
      complete(() => onImported([page]));
    } catch {
      setError("Couldn’t create this page. Try again.");
      setBusy(false);
    }
  }

  return (
    <Dialog title="Import" onClose={onClose} busy={busy}>
      {(close, complete) => (fetched === null ? (
        <form onSubmit={fetchAndParse} onDragOver={handleDragOver} onDragLeave={() => setDragActive(false)} onDrop={handleDrop}>
          <div role="group" aria-label="Import from" className={clsx("flex rounded-md border border-ink/20 p-1")}>
            <button type="button" disabled={busy} onClick={() => switchSource("url")} className={clsx("flex-1 rounded-md py-1.5 text-sm font-medium", source === "url" ? "bg-ink/10 text-ink" : "text-muted hover:text-ink")}>From URL</button>
            <button type="button" disabled={busy} onClick={() => switchSource("file")} className={clsx("flex-1 rounded-md py-1.5 text-sm font-medium", source === "file" ? "bg-ink/10 text-ink" : "text-muted hover:text-ink")}>From file</button>
          </div>
          <div className={clsx(
            "mt-5 rounded-md border-2 border-dashed p-4 transition-colors motion-reduce:transition-none",
            dragActive && source === "url" ? "border-action bg-action/5" : "border-transparent",
          )}>
            <fieldset disabled={busy} className={clsx("space-y-5")}>
              {source === "url" ? (
                <TextInput
                  label="Page URL" autoFocus required type="url" name="url" value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://school.edu/course/module/123"
                  hint="Paste a public course or module page. Pages that require login aren’t supported yet."
                />
              ) : (
                <ImportFileSlot
                  file={file}
                  dragging={dragActive}
                  disabled={busy}
                  onChoose={() => void chooseFile()}
                  onClear={() => setFile(null)}
                />
              )}
            </fieldset>
            {source === "url" && (
              <Caption tone="muted" className={clsx("mt-3 text-center")}>
                {dragActive ? "Drop to import the file instead" : "or drag a PDF, Word or Markdown file in from anywhere in this window"}
              </Caption>
            )}
          </div>
          {error && <BodyText role="alert" tone="error" className={clsx("mt-4")}>{error}</BodyText>}
          <div className={clsx("mt-8 flex justify-end gap-3 border-t border-ink/10 pt-5")}>
            <button type="button" disabled={busy} onClick={close} className={clsx("rounded-md border border-ink/15 px-4 py-2 text-sm font-medium", "hover:bg-ink/5")}>Cancel</button>
            <button type="submit" disabled={busy} className={clsx("rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action", "hover:bg-action/85")}>{busy ? "Reading…" : source === "url" ? "Fetch page" : "Read file"}</button>
          </div>
        </form>
      ) : (
        <div>
          <fieldset disabled={busy} className={clsx("space-y-5")}>
            <TextInput label="Page title" autoFocus required name="title" value={fetched.title} onChange={(event) => setFetched({ ...fetched, title: event.target.value })} />
            <Select label="Type" value={fetched.type} onChange={(value) => setFetched({ ...fetched, type: value })} options={pageTypes.map((value) => ({ value, label: pageTypeLabels[value] }))} />
          </fieldset>
          {error && <BodyText role="alert" tone="error" className={clsx("mt-4")}>{error}</BodyText>}
          <div className={clsx("mt-8 flex justify-end gap-3 border-t border-ink/10 pt-5")}>
            <button type="button" disabled={busy} onClick={() => setFetched(null)} className={clsx("rounded-md border border-ink/15 px-4 py-2 text-sm font-medium", "hover:bg-ink/5")}>Back</button>
            <button type="button" disabled={busy} onClick={() => importPage(complete)} className={clsx("rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action", "hover:bg-action/85")}>{busy ? "Importing…" : "Import page"}</button>
          </div>
        </div>
      ))}
    </Dialog>
  );
}
