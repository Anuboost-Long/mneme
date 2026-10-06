import { fileExtension } from "@/features/courses/lib/page-files";
import { formatSize } from "@/shared/lib/formatSize";
import { BodyText, Caption } from "@/shared/ui/Typography";
import clsx from "clsx";

const fileLabel = (file: File) => fileExtension(file.name)?.toUpperCase().slice(0, 4) ?? "FILE";

// The files to import: an empty drop area, or each chosen file as a card
// that says plainly it's there and that choosing again replaces them.
export default function ImportFileSlot({
  files,
  dragging,
  disabled,
  onChoose,
  onRemove
}: Readonly<{
  files: File[];
  dragging: boolean;
  disabled: boolean;
  onChoose: () => void;
  onRemove: (file: File) => void;
}>) {
  if (!files.length) {
    return (
      <div
        className={clsx(
          "flex flex-col items-center gap-3 rounded-lg px-4 py-8 text-center",
          "border-2 border-dashed",
          dragging ? "border-action bg-action/5" : "border-ink/20"
        )}
      >
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={clsx("text-muted")}
        >
          <path d="M12 16V4m0 0-4 4m4-4 4 4M5 16v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
        </svg>
        <BodyText>
          {dragging
            ? "Drop to import"
            : "Drop files here: PDF, Word, Markdown, text, pictures, audio or video"}
        </BodyText>
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
          Choose files…
        </button>
      </div>
    );
  }

  let hint =
    files.length > 1
      ? "Each file becomes its own page."
      : "Choosing or dropping other files replaces this one.";
  if (dragging) hint = "Drop to replace these files";

  return (
    <div className={clsx("space-y-2")}>
      <ul className={clsx("space-y-2")}>
        {files.map((file) => (
          <li
            key={`${file.name}-${file.size}-${file.lastModified}`}
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
              {fileLabel(file)}
            </span>
            <div className={clsx("min-w-0 flex-1")}>
              <p className={clsx("truncate text-sm font-medium")}>{file.name}</p>
              <Caption tone="muted">
                {fileLabel(file)} · {formatSize(file.size)} · Ready to import
              </Caption>
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onRemove(file)}
              aria-label={`Remove ${file.name}`}
              title="Remove file"
              className={clsx(
                "grid size-8 shrink-0 place-items-center rounded-md",
                "text-muted",
                "hover:bg-ink/5 hover:text-ink focus-visible:outline-1 focus-visible:outline-ink"
              )}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
      <div className={clsx("flex flex-wrap items-center justify-between gap-3")}>
        <Caption tone="muted">{hint}</Caption>
        <button
          type="button"
          disabled={disabled}
          onClick={onChoose}
          className={clsx(
            "h-8 shrink-0 rounded-md px-3 text-sm",
            "border border-ink/20 bg-surface",
            "hover:bg-ink/5 focus-visible:outline-1 focus-visible:outline-ink"
          )}
        >
          Choose other files
        </button>
      </div>
    </div>
  );
}
