import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import clsx from "clsx";
import type { ImageAlign } from "./AlignableImage";

const aligns: { value: ImageAlign; label: string; path: string }[] = [
  { value: "left", label: "Align left", path: "M4 6h16M4 12h10M4 18h13" },
  { value: "center", label: "Align center", path: "M4 6h16M7 12h10M5.5 18h13" },
  { value: "right", label: "Align right", path: "M4 6h16M10 12h10M7 18h13" },
];

const MIN_WIDTH = 80;

export default function ImageNodeView({ node, updateAttributes, deleteNode, selected }: Readonly<ReactNodeViewProps>) {
  const currentAlign = (node.attrs.align as ImageAlign | undefined) || "center";
  const imgRef = useRef<HTMLImageElement>(null);
  const dragStart = useRef<{ pointerX: number; startWidth: number } | null>(null);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const width = dragWidth ?? (node.attrs.width as number | null);

  function startResize(event: ReactPointerEvent<HTMLDivElement>) {
    const img = imgRef.current;
    if (!img) return;
    event.preventDefault();
    dragStart.current = { pointerX: event.clientX, startWidth: img.getBoundingClientRect().width };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function resizeMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    const next = Math.round(dragStart.current.startWidth + (event.clientX - dragStart.current.pointerX));
    setDragWidth(Math.max(MIN_WIDTH, next));
  }

  function endResize() {
    if (!dragStart.current) return;
    dragStart.current = null;
    if (dragWidth) updateAttributes({ width: dragWidth });
    setDragWidth(null);
  }

  return (
    <NodeViewWrapper className="group" data-align={currentAlign}>
      <img
        ref={imgRef}
        src={node.attrs.src}
        alt={node.attrs.alt ?? ""}
        title={node.attrs.title ?? undefined}
        style={width ? { width: `${width}px` } : undefined}
        draggable
        data-drag-handle
      />
      <div
        onPointerDown={startResize}
        onPointerMove={resizeMove}
        onPointerUp={endResize}
        role="separator"
        aria-label="Resize image"
        aria-orientation="vertical"
        className={clsx(
          "absolute right-1 bottom-1 z-10 size-3 cursor-nwse-resize rounded-sm",
          "border border-ink/40 bg-surface",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
        )}
      />
      <div
        className={clsx(
          "absolute top-2 right-2 z-10 flex items-center gap-1 rounded-lg",
          "border border-ink/20 bg-surface shadow-lg",
          "p-1 transition-opacity",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100",
        )}
      >
        {aligns.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            aria-pressed={currentAlign === option.value}
            onClick={() => updateAttributes({ align: option.value })}
            className={clsx(
              "flex size-8 items-center justify-center rounded-md",
              currentAlign === option.value ? "bg-ink/10 text-ink" : "text-muted hover:bg-ink/5 hover:text-ink",
            )}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={option.path} /></svg>
          </button>
        ))}
        <span aria-hidden="true" className={clsx("mx-1 h-5 w-px bg-ink/10")} />
        <button type="button" aria-label="Remove image" onClick={() => deleteNode()} className={clsx("flex size-8 items-center justify-center rounded-md text-muted", "hover:bg-danger/10 hover:text-danger")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" /></svg>
        </button>
      </div>
    </NodeViewWrapper>
  );
}
