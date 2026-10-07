import { fileImportKind } from "@/features/courses/lib/file-import";
import type { ImportStatus } from "@/features/courses/lib/import-save";
import { BodyText, Caption } from "@/shared/ui/Typography";
import clsx from "clsx";

const statusText = (status: ImportStatus) => {
  switch (status.state) {
    case "waiting":
      return "Waiting";
    case "importing":
      return "Importing…";
    case "done":
      return "Imported";
    case "failed":
      return status.reason;
  }
};

export const mediaNote = (files: File[]) =>
  files.some((file) => ["audio", "video"].includes(fileImportKind(file) ?? ""))
    ? "Audio and video are transcribed in the background; the corner shows their progress."
    : undefined;

export default function ImportBatch({
  names,
  statuses,
  note
}: Readonly<{ names: string[]; statuses: ImportStatus[]; note?: string }>) {
  const done = statuses.filter(
    (status) => status.state === "done" || status.state === "failed"
  ).length;

  return (
    <div>
      <BodyText role="status">
        {done < names.length
          ? `Importing ${done + 1} of ${names.length}…`
          : `Imported ${statuses.filter((status) => status.state === "done").length} of ${names.length}.`}
      </BodyText>
      <progress
        max={names.length}
        value={done}
        aria-label="Items imported"
        className={clsx("import-progress mt-2 block h-1.5 w-full")}
      />
      <ul className={clsx("mt-4 divide-y divide-ink/10 border-y border-ink/10")}>
        {names.map((name, index) => (
          <li
            key={`${index}-${name}`}
            className={clsx("flex items-baseline justify-between gap-3 py-2")}
          >
            <span className={clsx("min-w-0 truncate text-sm")}>{name}</span>
            <Caption
              tone={statuses[index].state === "failed" ? "error" : "muted"}
              className={clsx("max-w-1/2 shrink-0 text-right")}
            >
              {statusText(statuses[index])}
            </Caption>
          </li>
        ))}
      </ul>
      {note && (
        <Caption tone="muted" className={clsx("mt-3 block")}>
          {note}
        </Caption>
      )}
    </div>
  );
}
