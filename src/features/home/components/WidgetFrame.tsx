import clsx from "clsx";
import { useRef, type KeyboardEvent, type PointerEvent, type ReactNode, type Ref } from "react";

import DragHandle from "../../../shared/ui/DragHandle";
import type { WidgetSize } from "../lib/widgets";

export const sizeLabels: Record<WidgetSize, string> = { small: "Small", medium: "Medium", wide: "Wide", large: "Large" };

// Grid spans on Home's 2 / 4 / 6 column grid (see HomePage).
export const sizeSpans: Record<WidgetSize, string> = {
  small: "col-span-1 row-span-1",
  medium: "col-span-2 row-span-1",
  wide: "col-span-2 row-span-1 @2xl:col-span-4",
  large: "col-span-2 row-span-2"
};

// Columns x rows each size covers, used to snap a resize drag.
const sizeCells: Record<WidgetSize, { columns: number; rows: number }> = {
  small: { columns: 1, rows: 1 },
  medium: { columns: 2, rows: 1 },
  wide: { columns: 4, rows: 1 },
  large: { columns: 2, rows: 2 }
};

// The supported size closest to a span of `columns` x `rows` cells.
function nearestSize(sizes: WidgetSize[], columns: number, rows: number) {
  const distance = (size: WidgetSize) => Math.abs(sizeCells[size].columns - columns) + Math.abs(sizeCells[size].rows - rows) * 2;
  return sizes.reduce((best, size) => (distance(size) < distance(best) ? size : best));
}

// The grid's cell and gap sizes, read live so a resize snaps to whatever
// column count the window currently has.
function gridMetrics(grid: HTMLElement) {
  const style = getComputedStyle(grid);
  const columns = style.gridTemplateColumns.split(" ");
  return {
    columns: columns.length,
    cellWidth: Number.parseFloat(columns[0]),
    rowHeight: Number.parseFloat(style.gridAutoRows),
    gap: Number.parseFloat(style.columnGap)
  };
}

const iconButton = clsx("grid size-7 shrink-0 place-items-center rounded-md", "text-muted", "hover:bg-ink/6 hover:text-ink focus-visible:outline-1 focus-visible:outline-ink");

export default function WidgetFrame({ ref, widgetId, title, size, sizes, editing, dragging, handle, onResize, onSettings, onRemove, children }: Readonly<{
  ref?: Ref<HTMLLIElement>;
  widgetId: number;
  title: string;
  size: WidgetSize;
  sizes: WidgetSize[];
  editing: boolean;
  dragging: boolean;
  handle: { onPointerDown: (event: PointerEvent<HTMLElement>) => void; onKeyDown: (event: KeyboardEvent<HTMLElement>) => void };
  onResize: (size: WidgetSize) => void;
  onSettings: (() => void) | null;
  onRemove: () => void;
  children: ReactNode;
}>) {
  const resize = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const item = useRef<HTMLLIElement | null>(null);

  function startResize(event: PointerEvent<HTMLButtonElement>) {
    const box = item.current?.getBoundingClientRect();
    if (event.button !== 0 || !box) return;
    event.preventDefault();
    resize.current = { x: event.clientX, y: event.clientY, width: box.width, height: box.height };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveResize(event: PointerEvent<HTMLButtonElement>) {
    const start = resize.current;
    const grid = item.current?.parentElement;
    if (!start || !grid) return;
    const { columns, cellWidth, rowHeight, gap } = gridMetrics(grid);
    const spanColumns = Math.min(columns, Math.max(1, Math.round((start.width + event.clientX - start.x + gap) / (cellWidth + gap))));
    const spanRows = Math.min(2, Math.max(1, Math.round((start.height + event.clientY - start.y + gap) / (rowHeight + gap))));
    const snapped = nearestSize(sizes, spanColumns, spanRows);
    if (snapped !== size) onResize(snapped);
  }

  // Right/Down grow and Left/Up shrink, one size at a time.
  function resizeWithKeys(event: KeyboardEvent<HTMLButtonElement>) {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const next = sizes[sizes.indexOf(size) + step];
    if (next) onResize(next);
  }

  return (
    <li
      ref={(element) => {
        item.current = element;
        if (typeof ref === "function") ref(element);
      }}
      data-widget-id={widgetId}
      className={clsx("relative min-w-0", sizeSpans[size], dragging && "z-10")}
    >
      <article
        aria-label={title}
        className={clsx(
          "@container flex h-full flex-col overflow-hidden rounded-lg",
          "border bg-surface",
          editing ? "border-ink/25" : "border-ink/10",
          editing && !dragging && "widget-wiggle",
          dragging && "shadow-lg"
        )}
      >
        <header className={clsx("flex h-9 shrink-0 items-center gap-1 px-3", editing && "pl-1")}>
          {editing && <DragHandle name={title} {...handle} />}
          <h2 className={clsx("min-w-0 flex-1 truncate text-xs font-medium text-muted")}>{title}</h2>
          {editing && (
            <>
              {onSettings && (
                <button type="button" onClick={onSettings} aria-label={`Settings for ${title}`} title="Settings" className={iconButton}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
                    <circle cx="16" cy="6" r="2" />
                    <circle cx="10" cy="12" r="2" />
                    <circle cx="18" cy="18" r="2" />
                  </svg>
                </button>
              )}
            </>
          )}
        </header>
        <div inert={editing} className={clsx("min-h-0 flex-1 overflow-hidden")}>
          {children}
        </div>
      </article>
      {editing && sizes.length > 1 && (
        <button
          type="button"
          onPointerDown={startResize}
          onPointerMove={moveResize}
          onPointerUp={() => (resize.current = null)}
          onPointerCancel={() => (resize.current = null)}
          onKeyDown={resizeWithKeys}
          aria-label={`Resize ${title}, now ${sizeLabels[size]}. Drag the corner, or use the arrow keys.`}
          title="Drag to resize"
          className={clsx("absolute right-0 bottom-0 z-10 grid size-6 cursor-nwse-resize touch-none place-items-center rounded-tl-md rounded-br-lg", "text-muted", "hover:text-ink focus-visible:outline-1 focus-visible:outline-ink")}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <path d="M9 3 3 9M9 6.5 6.5 9" />
          </svg>
        </button>
      )}
      {editing && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${title}`}
          title="Remove"
          className={clsx("absolute -top-2 -left-2 z-10 grid size-6 place-items-center rounded-full", "bg-ink text-surface", "hover:bg-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink")}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M3 6h6" />
          </svg>
        </button>
      )}
    </li>
  );
}
