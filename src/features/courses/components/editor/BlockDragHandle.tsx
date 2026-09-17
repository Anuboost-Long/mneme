import { DragHandle } from "@tiptap/extension-drag-handle-react";
import type { Editor } from "@tiptap/react";
import clsx from "clsx";

export default function BlockDragHandle({ editor }: Readonly<{ editor: Editor }>) {
  return (
    <DragHandle
      editor={editor}
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
