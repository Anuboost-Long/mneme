import { NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import clsx from "clsx";
import { useId, useRef, useState, type PointerEvent as ReactPointerEvent, type ToggleEvent } from "react";
import { createPortal } from "react-dom";

import { hideUntilPlaced, placePopover } from "../../../../shared/lib/placePopover";
import { BodyText } from "../../../../shared/ui/Typography";
import type { ImageAiAction, ImageAlign } from "./AlignableImage";
import ExtractTableDialog from "./ExtractTableDialog";
import ExtractTextDialog, { type ExtractPlacement } from "./ExtractTextDialog";
import ImageViewer from "./ImageViewer";
import { insertParagraphs } from "./insertParagraphs";

const aligns: { value: ImageAlign; label: string; path: string }[] = [
  { value: "left", label: "Align left", path: "M4 6h16M4 12h10M4 18h13" },
  { value: "center", label: "Align center", path: "M4 6h16M7 12h10M5.5 18h13" },
  { value: "right", label: "Align right", path: "M4 6h16M10 12h10M7 18h13" }
];

const MIN_WIDTH = 80;

const captionAligns: Record<ImageAlign, string> = { left: "text-left", center: "text-center", right: "text-right" };

const menuItem = clsx(
  "flex w-full items-center rounded-md px-3 py-2 text-left",
  "hover:bg-ink/7 focus-visible:bg-ink/7 focus-visible:outline-none"
);

export default function ImageNodeView({
  node,
  editor,
  getPos,
  updateAttributes,
  deleteNode,
  selected
}: Readonly<ReactNodeViewProps>) {
  const [extracting, setExtracting] = useState<"text" | "table" | null>(null);
  const [viewing, setViewing] = useState(false);
  const [aiProblem, setAiProblem] = useState("");
  const menuId = useId();
  const menu = useRef<HTMLDivElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const caption = (node.attrs.caption as string | null) ?? "";
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
    const next = Math.round(
      dragStart.current.startWidth + (event.clientX - dragStart.current.pointerX)
    );
    setDragWidth(Math.max(MIN_WIDTH, next));
  }

  function endResize() {
    if (!dragStart.current) return;
    dragStart.current = null;
    if (dragWidth) updateAttributes({ width: dragWidth });
    setDragWidth(null);
  }

  function placeMenu(event: ToggleEvent<HTMLDivElement>) {
    if (event.newState !== "open" || !menuTrigger.current) return;
    placePopover(event.currentTarget, menuTrigger.current, "end");
    event.currentTarget.querySelector("button")?.focus({ preventScroll: true });
  }

  function choose(action: () => void) {
    menu.current?.hidePopover();
    setAiProblem("");
    action();
  }

  async function runAi(kind: ImageAiAction) {
    const position = getPos();
    if (position === undefined) return;
    editor.chain().focus().setNodeSelection(position).run();
    const run = editor.storage.image.runAiAction;
    setAiProblem(run ? ((await run(kind)) ?? "") : "AI actions aren’t available here.");
  }

  function placementRange(placement: ExtractPlacement) {
    const position = getPos();
    if (position === undefined) return undefined;
    return placement === "replace"
      ? { from: position, to: position + node.nodeSize }
      : { from: position + node.nodeSize };
  }

  function insertExtracted(text: string, placement: ExtractPlacement) {
    const range = placementRange(placement);
    if (range) insertParagraphs(editor, text, range);
  }

  function insertTables(html: string, placement: ExtractPlacement) {
    const range = placementRange(placement);
    if (range) editor.chain().focus().insertContentAt(range.to === undefined ? range.from : range, html).run();
  }

  return (
    <NodeViewWrapper className="group" data-align={currentAlign}>
      <div className={clsx("relative")}>
        <img
          ref={imgRef}
          src={node.attrs.src}
          alt={node.attrs.alt || caption}
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
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
          )}
        />
      </div>
      <input
        value={caption}
        size={1}
        onChange={(event) => updateAttributes({ caption: event.target.value || null })}
        readOnly={!editor.isEditable}
        placeholder="Add a caption"
        aria-label="Image caption"
        className={clsx(
          "mt-1.5 block w-full min-w-0",
          "bg-transparent",
          "text-sm text-muted placeholder:text-muted/60",
          captionAligns[currentAlign],
          "focus-visible:outline-none",
          !caption && !selected && "opacity-0 group-hover:opacity-100 focus:opacity-100"
        )}
      />
      {aiProblem && (
        <BodyText role="alert" tone="error" className={clsx("mt-1")}>
          {aiProblem}
        </BodyText>
      )}
      <div
        className={clsx(
          "absolute top-2 right-2 z-10 flex items-center gap-1 rounded-lg",
          "border border-ink/20 bg-surface shadow-lg",
          "p-1 transition-opacity",
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
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
              currentAlign === option.value
                ? "bg-ink/10 text-ink"
                : "text-muted hover:bg-ink/5 hover:text-ink"
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
              <path d={option.path} />
            </svg>
          </button>
        ))}
        <span aria-hidden="true" className={clsx("mx-1 h-5 w-px bg-ink/10")} />
        <button
          type="button"
          aria-label="Open full size"
          onClick={() => setViewing(true)}
          className={clsx(
            "flex size-8 items-center justify-center rounded-md text-muted",
            "hover:bg-ink/5 hover:text-ink"
          )}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </button>
        <button
          ref={menuTrigger}
          type="button"
          popoverTarget={menuId}
          aria-label="More image actions"
          className={clsx(
            "flex size-8 items-center justify-center rounded-md text-muted",
            "hover:bg-ink/5 hover:text-ink"
          )}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="19" cy="12" r="1.5" />
          </svg>
        </button>
        <div
          ref={menu}
          id={menuId}
          popover="auto"
          onBeforeToggle={(event) => hideUntilPlaced(event.currentTarget, event.newState)}
          onToggle={placeMenu}
          className={clsx("fixed m-0 w-48 rounded-lg", "border border-ink/20 bg-surface shadow-lg", "p-1 text-sm text-ink")}
        >
          <button type="button" onClick={() => choose(() => void runAi("explain"))} className={menuItem}>
            Explain image
          </button>
          <button type="button" onClick={() => choose(() => void runAi("summarize"))} className={menuItem}>
            Summarize image
          </button>
          <button type="button" onClick={() => choose(() => setExtracting("text"))} className={clsx(menuItem, "mt-1 border-t border-ink/10")}>
            Extract text
          </button>
          <button type="button" onClick={() => choose(() => setExtracting("table"))} className={menuItem}>
            Extract table
          </button>
        </div>
        <span aria-hidden="true" className={clsx("mx-1 h-5 w-px bg-ink/10")} />
        <button
          type="button"
          aria-label="Remove image"
          onClick={() => deleteNode()}
          className={clsx(
            "flex size-8 items-center justify-center rounded-md text-muted",
            "hover:bg-danger/10 hover:text-danger"
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
        </button>
      </div>
      {viewing &&
        createPortal(
          <ImageViewer
            src={node.attrs.src}
            alt={node.attrs.alt ?? ""}
            caption={caption}
            origin={imgRef.current}
            onClose={() => setViewing(false)}
          />,
          document.body
        )}
      {extracting === "text" &&
        createPortal(
          <ExtractTextDialog
            imageSrc={node.attrs.src}
            onInsert={insertExtracted}
            onClose={() => setExtracting(null)}
          />,
          document.body
        )}
      {extracting === "table" &&
        createPortal(
          <ExtractTableDialog
            imageSrc={node.attrs.src}
            onInsert={insertTables}
            onClose={() => setExtracting(null)}
          />,
          document.body
        )}
    </NodeViewWrapper>
  );
}
