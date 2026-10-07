import { hideUntilPlaced, placePopover } from "@/shared/lib/placePopover";
import clsx from "clsx";
import { useId, useLayoutEffect, useRef, useState } from "react";

import RecordingSoundSettings from "./RecordingSoundSettings";

export default function SoundSettingsButton({ className }: Readonly<{ className?: string }>) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const popover = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    const element = popover.current;
    const anchor = trigger.current;
    if (!open || !element || !anchor) return;
    const observer = new ResizeObserver(() => placePopover(element, anchor, "end"));
    observer.observe(element);
    return () => observer.disconnect();
  }, [open]);

  return (
    <>
      <button
        ref={trigger}
        type="button"
        popoverTarget={id}
        aria-label="Sound settings"
        title="Sound settings"
        className={clsx(
          "grid size-9 shrink-0 place-items-center rounded-md text-muted",
          "hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-ink",
          className
        )}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1" />
          <circle cx="16" cy="6" r="2" />
          <circle cx="10" cy="12" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
      </button>
      <div
        ref={popover}
        id={id}
        popover="auto"
        aria-label="Sound settings"
        onBeforeToggle={(event) => hideUntilPlaced(event.currentTarget, event.newState)}
        onToggle={(event) => setOpen(event.newState === "open")}
        className={clsx(
          "fixed m-0 w-80 rounded-lg",
          "border border-ink/20 bg-surface p-4 text-ink shadow-lg"
        )}
      >
        {open && <RecordingSoundSettings />}
      </div>
    </>
  );
}
