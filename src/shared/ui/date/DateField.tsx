import { Typography } from "@/shared/ui/Typography";
import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";
import clsx from "clsx";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import Calendar from "./Calendar";
import { isDayOutOfBounds, parseIsoDate, toIsoDate, type DateBounds } from "./calendarGrid";

const shownDate = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric"
});

export default function DateField({
  label,
  value,
  onChange,
  bounds,
  placeholder = "No date"
}: Readonly<{
  label: string;
  value: string | null;
  onChange: (iso: string | null) => void;
  bounds?: DateBounds;
  placeholder?: string;
}>) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const date = parseIsoDate(value);
  const todayIso = toIsoDate(new Date());

  useEffect(() => {
    if (!open) return;
    function dismissOnOutside(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        (trigger.current?.contains(event.target) || panel.current?.contains(event.target))
      )
        return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", dismissOnOutside);
    return () => document.removeEventListener("pointerdown", dismissOnOutside);
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !trigger.current || !panel.current) return;
    return autoUpdate(trigger.current, panel.current, () => {
      if (!trigger.current || !panel.current) return;
      void computePosition(trigger.current, panel.current, {
        placement: "bottom-start",
        middleware: [offset(4), flip({ padding: 8 }), shift({ padding: 8 })]
      }).then(({ x, y }) => {
        if (!panel.current) return;
        panel.current.style.left = `${x}px`;
        panel.current.style.top = `${y}px`;
      });
    });
  }, [open]);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  function pick(iso: string | null) {
    onChange(iso);
    close();
  }

  return (
    <div className={clsx("space-y-2")}>
      <label htmlFor={id} className={clsx("block")}>
        <Typography as="span" variant="label">
          {label}
        </Typography>
      </label>
      <button
        ref={trigger}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((isOpen) => !isOpen)}
        className={clsx(
          "flex h-11 w-full min-w-0 items-center gap-2 rounded-md px-3 text-left text-sm",
          "border border-ink/20 bg-surface",
          "focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink"
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
          className={clsx("shrink-0 text-muted")}
        >
          <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
        <span className={clsx("min-w-0 flex-1 truncate", !date && "text-muted")}>
          {date ? shownDate.format(date) : placeholder}
        </span>
      </button>
      {open && (
        <dialog
          ref={panel}
          open
          aria-label={`Choose ${label.toLowerCase()}`}
          className={clsx(
            "fixed right-auto bottom-auto z-20 m-0 rounded-lg",
            "border border-ink/20 bg-surface p-3 text-ink shadow-lg"
          )}
        >
          <Calendar value={value} bounds={bounds} onSelect={pick} onEscape={close} />
          <div
            className={clsx("mt-3 flex items-center justify-between border-t border-ink/10 pt-3")}
          >
            <button
              type="button"
              onClick={() => pick(todayIso)}
              disabled={isDayOutOfBounds(todayIso, bounds)}
              className={clsx(
                "rounded-md border border-ink/15 px-3 py-1.5 text-xs font-medium",
                "enabled:hover:bg-ink/5 disabled:opacity-40"
              )}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => pick(null)}
              disabled={!value}
              className={clsx(
                "rounded-md px-3 py-1.5 text-xs text-muted",
                "enabled:hover:bg-danger/10 enabled:hover:text-danger disabled:opacity-40"
              )}
            >
              Clear date
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
