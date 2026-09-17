import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { autoUpdate, computePosition, flip, offset, shift, size } from "@floating-ui/dom";
import clsx from "clsx";
import { Typography } from "./Typography";

export type SelectOption<T extends string | number> = { value: T; label: string };

export default function Select<T extends string | number>({ id, label, value, onChange, options, disabled }: Readonly<{
  id?: string;
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  disabled?: boolean;
}>) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(value);

  useEffect(() => {
    if (!open) return;
    setActive(value);
    function dismissOnOutside(event: PointerEvent) {
      if (event.target instanceof Node && (trigger.current?.contains(event.target) || list.current?.contains(event.target))) return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", dismissOnOutside);
    return () => document.removeEventListener("pointerdown", dismissOnOutside);
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const index = options.findIndex((option) => option.value === active);
    const item = list.current?.children[index];
    if (item instanceof HTMLElement) item.scrollIntoView({ block: "nearest" });
  }, [open, active, options]);

  useLayoutEffect(() => {
    if (!open || !trigger.current || !list.current) return;
    return autoUpdate(trigger.current, list.current, () => {
      if (!trigger.current || !list.current) return;
      void computePosition(trigger.current, list.current, {
        placement: "bottom-start",
        middleware: [
          offset(4),
          flip({ padding: 8 }),
          shift({ padding: 8 }),
          size({
            padding: 8,
            apply({ availableHeight, rects, elements }) {
              elements.floating.style.width = `${rects.reference.width}px`;
              elements.floating.style.maxHeight = `${Math.min(availableHeight, 224)}px`;
            },
          }),
        ],
      }).then(({ x, y }) => {
        if (!list.current) return;
        list.current.style.left = `${x}px`;
        list.current.style.top = `${y}px`;
      });
    });
  }, [open]);

  function select(next: T) {
    onChange(next);
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const index = options.findIndex((option) => option.value === active);
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) { setOpen(true); break; }
        setActive(options[(index + 1) % options.length].value);
        break;
      case "ArrowUp":
        event.preventDefault();
        if (!open) { setOpen(true); break; }
        setActive(options[(index - 1 + options.length) % options.length].value);
        break;
      case "Home":
        if (open) { event.preventDefault(); setActive(options[0].value); }
        break;
      case "End":
        if (open) { event.preventDefault(); setActive(options[options.length - 1].value); }
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        open ? select(active) : setOpen(true);
        break;
      case "Escape":
        if (open) { event.preventDefault(); setOpen(false); }
        break;
    }
  }

  const current = options.find((option) => option.value === value);

  return (
    <div>
      <div className={clsx("space-y-2")}>
        <label htmlFor={selectId} className={clsx("block")}><Typography as="span" variant="label">{label}</Typography></label>
        <button
          ref={trigger}
          id={selectId}
          type="button"
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-activedescendant={open ? `${selectId}-${active}` : undefined}
          onClick={() => setOpen((isOpen) => !isOpen)}
          onKeyDown={handleKeyDown}
          className={clsx(
            "flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-md",
            "bg-surface border border-ink/20",
            "px-3 py-2.5 text-left text-sm font-normal text-ink",
            "focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink",
            disabled && "opacity-50",
          )}
        >
          <span className={clsx("truncate")}>{current?.label}</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={clsx("shrink-0 text-muted", open && "rotate-180")}><path d="m6 9 6 6 6-6" /></svg>
        </button>
      </div>
      {open && (
        <ul
          ref={list}
          role="listbox"
          aria-label={label}
          tabIndex={-1}
          className={clsx(
            "fixed z-20 overflow-y-auto rounded-md",
            "border border-ink/20 bg-surface shadow-lg",
            "p-1 text-sm text-ink",
          )}
        >
          {options.map((option) => (
            <li key={option.value} id={`${selectId}-${option.value}`} role="option" aria-selected={option.value === value}>
              <button
                type="button"
                tabIndex={-1}
                onMouseEnter={() => setActive(option.value)}
                onClick={() => select(option.value)}
                className={clsx(
                  "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left",
                  option.value === active ? "bg-ink/10" : "hover:bg-ink/5",
                )}
              >
                <span className={clsx("truncate")}>{option.label}</span>
                {option.value === value && <span aria-hidden="true">✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
