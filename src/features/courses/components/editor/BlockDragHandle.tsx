import { useRef } from "react";
import { DragHandle } from "@tiptap/extension-drag-handle-react";
import type { Editor } from "@tiptap/react";
import { offset } from "@floating-ui/dom";
import clsx from "clsx";

const LIST_ITEM_TYPES = new Set(["listItem", "taskItem"]);

export default function BlockDragHandle({ editor }: Readonly<{ editor: Editor }>) {
  const hoveredTypeRef = useRef<string | null>(null);
  // The library's default position (`placement: "left-start"`, no offset)
  // puts the handle flush against the block's left edge. For a heading or
  // paragraph that's an empty margin, fine — but for a list item it's the
  // exact spot the browser renders the bullet/number marker, so the two
  // sit on top of each other. `padding-left: 3em` on ul/ol (App.css) widens
  // the indent to fit both; this offset (only applied for list items, via
  // `onNodeChange` below — headings/paragraphs keep the flush default)
  // pushes the handle far enough left to clear the marker within that
  // wider indent, tuned together with the CSS.
  const configRef = useRef({
    placement: "left-start" as const,
    strategy: "absolute" as const,
    middleware: [offset(() => (hoveredTypeRef.current && LIST_ITEM_TYPES.has(hoveredTypeRef.current) ? 22 : 0))],
  });

  return (
    <DragHandle
      editor={editor}
      computePositionConfig={configRef.current}
      onNodeChange={({ node }) => { hoveredTypeRef.current = node?.type.name ?? null; }}
      // Plain `nested` (edge detection on) fights its own list rules: near
      // a bullet/number marker — exactly where you'd hover to grab that
      // item — the list item is excluded by proximity-to-edge scoring at
      // the same time its list wrapper is excluded by the default
      // "prefer the item over the list" rule, so there's a dead zone with
      // no valid target at all. Disabling edge detection removes that
      // fight; list items stay a stable target across their full width.
      nested={{ edgeDetection: "none" }}
    >
      <div
        role="button"
        aria-label="Drag to reorder"
        className={clsx(
          "flex size-6 cursor-grab items-center justify-center rounded-md text-muted",
          "hover:bg-ink/5 hover:text-ink active:cursor-grabbing",
        )}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="9" cy="6" r="1.4" /><circle cx="15" cy="6" r="1.4" />
          <circle cx="9" cy="12" r="1.4" /><circle cx="15" cy="12" r="1.4" />
          <circle cx="9" cy="18" r="1.4" /><circle cx="15" cy="18" r="1.4" />
        </svg>
      </div>
    </DragHandle>
  );
}
