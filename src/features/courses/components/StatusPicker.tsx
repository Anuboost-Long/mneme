import { useId, useRef, type ReactNode, type ToggleEvent } from "react";
import clsx from "clsx";
import { hideUntilPlaced, placePopover } from "../../../shared/lib/placePopover";
import { CompletionStatus, completionStatuses, completionStatusLabels } from "../lib/completion-status";

export const statusMarkerStyles: Record<CompletionStatus, string> = {
  [CompletionStatus.NotStarted]: "border border-ink/20 bg-surface text-muted",
  [CompletionStatus.InProgress]: "border-2 border-chain-lime bg-surface text-ink",
  [CompletionStatus.Completed]: "bg-chain-lime text-chain-navy",
  [CompletionStatus.RevisionNeeded]: "border-2 border-dashed border-chain-lime bg-surface text-ink",
};

export default function StatusPicker({ status, itemLabel, onChange, triggerClassName, children }: Readonly<{
  status: CompletionStatus;
  itemLabel: string;
  onChange: (status: CompletionStatus) => void;
  triggerClassName: string;
  children: ReactNode;
}>) {
  const id = useId();
  const picker = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  function placePicker(event: ToggleEvent<HTMLDivElement>) {
    if (event.newState !== "open" || !trigger.current) return;
    placePopover(event.currentTarget, trigger.current, "start");
    event.currentTarget.querySelector<HTMLButtonElement>("[aria-pressed=true]")?.focus({ preventScroll: true });
  }

  function choose(option: CompletionStatus) {
    picker.current?.hidePopover();
    if (option !== status) onChange(option);
  }

  return (
    <>
      <button ref={trigger} type="button" popoverTarget={id} aria-label={`${itemLabel}: ${completionStatusLabels[status]}. Change status`} className={triggerClassName}>
        {children}
      </button>
      <div ref={picker} id={id} popover="auto" onBeforeToggle={(event) => hideUntilPlaced(event.currentTarget, event.newState)} onToggle={placePicker} className={clsx("fixed m-0 w-52 rounded-lg", "border border-ink/20 bg-surface shadow-lg", "p-1 text-sm text-ink")}>
        {completionStatuses.map((option) => (
          <button key={option} type="button" aria-pressed={option === status} onClick={() => choose(option)} className={clsx("flex w-full items-center gap-3 rounded-md px-3 py-2 text-left", "hover:bg-ink/7 focus-visible:bg-ink/7 focus-visible:outline-none", option === status && "font-medium")}>
            <span aria-hidden="true" className={clsx("size-4 shrink-0 rounded-full", statusMarkerStyles[option])} />
            <span className={clsx("flex-1")}>{completionStatusLabels[option]}</span>
            {option === status && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m5 12 5 5 9-10" /></svg>}
          </button>
        ))}
      </div>
    </>
  );
}
