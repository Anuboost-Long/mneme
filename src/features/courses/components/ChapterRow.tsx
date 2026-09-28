import clsx from "clsx";
import { Link } from "react-router-dom";
import { BodyText, Caption } from "../../../shared/ui/Typography";
import { completionStatusLabels, type CompletionStatus } from "../lib/completion-status";
import type { Module } from "../lib/modules";
import type { PageProgress } from "../lib/pages";
import ItemMenu from "./ItemMenu";
import StatusPicker, { statusMarkerStyles } from "./StatusPicker";

function pagesLabel(progress: PageProgress | undefined) {
  if (!progress?.total) return "No pages yet";
  return `${progress.done} of ${progress.total} ${progress.total === 1 ? "page" : "pages"} done`;
}

export default function ChapterRow({ module, number, progress, upNext, rail, to, onStatusChange, onEdit, onDelete }: Readonly<{
  module: Module;
  number: number;
  progress: PageProgress | undefined;
  upNext: boolean;
  rail: boolean;
  to: string;
  onStatusChange: (status: CompletionStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}>) {
  return (
    <li className={clsx("group relative flex items-start gap-4 py-4")}>
      {rail && <span aria-hidden="true" className={clsx("absolute top-16 -bottom-2 left-5 w-px bg-ink/15", "group-last:hidden")} />}
      <StatusPicker status={module.status} itemLabel={`Module ${number}, ${module.name}`} onChange={onStatusChange} triggerClassName={clsx("relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums", statusMarkerStyles[module.status], "hover:ring-4 hover:ring-ink/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink")}>
        {String(number).padStart(2, "0")}
      </StatusPicker>
      <div className={clsx("min-w-0 flex-1 pt-2")}>
        <Link to={to} className={clsx("block text-base font-medium wrap-anywhere", "after:absolute after:inset-0 after:rounded-md", "hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-ink")}>
          <span className={clsx("sr-only")}>Module {number}: </span>{module.name}<span className={clsx("sr-only")}>, {completionStatusLabels[module.status]}</span>
        </Link>
        {module.description && <BodyText tone="muted" className={clsx("mt-1 line-clamp-2 wrap-anywhere")}>{module.description}</BodyText>}
      </div>
      <div className={clsx("flex shrink-0 items-center gap-3 pt-1.5")}>
        <div className={clsx("hidden text-right sm:block")}>
          <Caption as="span" tone={upNext ? "text" : "muted"} className={clsx("block font-medium")}>{upNext ? "Up next" : completionStatusLabels[module.status]}</Caption>
          <Caption as="span" tone="muted" className={clsx("block")}>{pagesLabel(progress)}</Caption>
        </div>
        <ItemMenu label={module.name} onEdit={onEdit} onDelete={onDelete} />
      </div>
    </li>
  );
}
