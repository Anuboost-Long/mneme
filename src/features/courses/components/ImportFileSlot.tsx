import clsx from "clsx";

import { formatSize } from "../../../shared/lib/formatSize";
import { BodyText, Caption } from "../../../shared/ui/Typography";
import { fileImportKind } from "../lib/file-import";

const kindLabels = { pdf: "PDF", docx: "DOCX", markdown: "MD" } as const;

// The file to import: an empty drop area, or the chosen file as a card
// that says plainly it's there and that another one replaces it.
export default function ImportFileSlot({ file, dragging, disabled, onChoose, onClear }: Readonly<{
  file: File | null;
  dragging: boolean;
  disabled: boolean;
  onChoose: () => void;
  onClear: () => void;
}>) {
  if (!file) {
    return (
      <div
        className={clsx(
          "flex flex-col items-center gap-3 rounded-lg px-4 py-8 text-center",
          "border-2 border-dashed",
          dragging ? "border-action bg-action/5" : "border-ink/20"
        )}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={clsx("text-muted")}>
          <path d="M12 16V4m0 0-4 4m4-4 4 4M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
        </svg>
        <BodyText>{dragging ? "Drop to import" : "Drop a PDF, Word or Markdown file here"}</BodyText>
        <button
          type="button"
          disabled={disabled}
          onClick={onChoose}
          className={clsx(
            "inline-flex h-9 items-center rounded-md",
            "border border-ink/20 bg-surface",
            "px-4 text-sm font-medium",
            "hover:bg-ink/5 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink"
          )}
        >
          Choose file…
        </button>
      </div>
    );
  }

  const kind = fileImportKind(file);
  const label = kind ? kindLabels[kind] : "FILE";

  return (
    <div className={clsx("space-y-2")}>
      <div
        className={clsx(
          "flex items-center gap-3 rounded-lg p-3",
          "border-2",
          dragging ? "border-dashed border-action bg-action/5" : "border-ink/15 bg-ink/4"
        )}
      >
        <span
          aria-hidden="true"
          className={clsx(
            "flex size-11 shrink-0 items-center justify-center rounded-md",
            "bg-accent text-chain-navy",
            "text-xs font-bold tracking-wide"
          )}
        >
          {label}
        </span>
        <div className={clsx("min-w-0 flex-1")}>
          <p className={clsx("truncate text-sm font-medium")}>{dragging ? `Drop to replace ${file.name}` : file.name}</p>
          <Caption tone="muted">
            {label} · {formatSize(file.size)} · Ready to import
          </Caption>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onChoose}
          className={clsx("h-8 shrink-0 rounded-md px-3 text-sm", "border border-ink/20 bg-surface", "hover:bg-ink/5 focus-visible:outline-1 focus-visible:outline-ink")}
        >
          Replace
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={onClear}
          aria-label={`Remove ${file.name}`}
          title="Remove file"
          className={clsx("grid size-8 shrink-0 place-items-center rounded-md", "text-muted", "hover:bg-ink/5 hover:text-ink focus-visible:outline-1 focus-visible:outline-ink")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <Caption tone="muted">Choosing or dropping another file replaces this one.</Caption>
    </div>
  );
}
