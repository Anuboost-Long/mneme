import { hideUntilPlaced, placePopover } from "@/shared/lib/placePopover";
import clsx from "clsx";
import { useId, useRef, type ToggleEvent } from "react";

export type ItemAction = { label: string; icon: string; onSelect: () => void };

// Edit and Delete always; `actions` go between them.
export default function ItemMenu({
  label,
  editLabel = "Edit",
  onEdit,
  onDelete,
  actions = []
}: Readonly<{
  label: string;
  editLabel?: string;
  onEdit: () => void;
  onDelete: () => void;
  actions?: ItemAction[];
}>) {
  const id = useId();
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  function placeMenu(event: ToggleEvent<HTMLDivElement>) {
    if (event.newState !== "open" || !trigger.current) return;
    placePopover(event.currentTarget, trigger.current, "end");
    event.currentTarget.querySelector("button")?.focus({ preventScroll: true });
  }

  function choose(action: () => void) {
    menu.current?.hidePopover();
    action();
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        popoverTarget={id}
        aria-label={`Actions for ${label}`}
        className={clsx(
          "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-md",
          "text-muted",
          "hover:bg-ink/10 hover:text-ink focus-visible:text-ink"
        )}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
      </button>
      <div
        ref={menu}
        id={id}
        popover="auto"
        onBeforeToggle={(event) => hideUntilPlaced(event.currentTarget, event.newState)}
        onToggle={placeMenu}
        className={clsx(
          "fixed m-0 w-44 rounded-lg",
          "border border-ink/20 bg-surface shadow-lg",
          "p-1 text-sm text-ink"
        )}
      >
        <button
          type="button"
          onClick={() => choose(onEdit)}
          className={clsx(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left",
            "hover:bg-ink/7 focus-visible:bg-ink/7 focus-visible:outline-none"
          )}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="m16 3 5 5M4 20l4-1L21 6a2 2 0 0 0-5-3L3 16l-1 5 5-1" />
          </svg>
          {editLabel}
        </button>
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => choose(action.onSelect)}
            className={clsx(
              "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left",
              "hover:bg-ink/7 focus-visible:bg-ink/7 focus-visible:outline-none"
            )}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={action.icon} />
            </svg>
            {action.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => choose(onDelete)}
          className={clsx(
            "mt-1 flex w-full items-center gap-3 rounded-md border-t border-ink/10 px-3 py-2 text-left text-danger",
            "hover:bg-danger/10 focus-visible:bg-danger/10 focus-visible:outline-none"
          )}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
          </svg>
          Delete
        </button>
      </div>
    </>
  );
}
