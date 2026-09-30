import clsx from "clsx";
import type { KeyboardEvent, PointerEvent } from "react";

// The grip that useDragReorder's `handleProps` go on.
export default function DragHandle({ name, onPointerDown, onKeyDown, className }: Readonly<{
  name: string;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  className?: string;
}>) {
  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      aria-label={`Reorder ${name}. Drag, or use the up and down arrow keys.`}
      title="Drag to reorder, or use ↑ ↓"
      className={clsx(
        "flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md",
        "text-muted",
        "hover:bg-ink/5 hover:text-ink active:cursor-grabbing",
        className
      )}
    >
      <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true">
        <circle cx="3" cy="3" r="1.3" />
        <circle cx="9" cy="3" r="1.3" />
        <circle cx="3" cy="8" r="1.3" />
        <circle cx="9" cy="8" r="1.3" />
        <circle cx="3" cy="13" r="1.3" />
        <circle cx="9" cy="13" r="1.3" />
      </svg>
    </button>
  );
}
