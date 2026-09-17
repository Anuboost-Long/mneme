import { useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import clsx from "clsx";
import { blockCommands } from "./blockCommands";
import { blockIcons } from "./blockIcons";

export default function TurnIntoSubmenu({ editor, anchor, activeId, onHoverItem, onSelect, onMouseEnter, onMouseLeave }: Readonly<{
  editor: Editor;
  anchor: DOMRect;
  activeId: string;
  onHoverItem: (id: string) => void;
  onSelect: (id: string) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}>) {
  const panel = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!panel.current) return;
    const element = panel.current;
    const bounds = element.getBoundingClientRect();
    const gap = 6;
    const fitsRight = anchor.right + gap + bounds.width <= window.innerWidth - 8;
    element.style.left = `${fitsRight ? anchor.right + gap : Math.max(8, anchor.left - gap - bounds.width)}px`;
    element.style.top = `${Math.max(8, Math.min(anchor.top, window.innerHeight - bounds.height - 8))}px`;
  }, [anchor]);

  useLayoutEffect(() => {
    panel.current?.querySelector(`#turn-into-${activeId}`)?.scrollIntoView({ block: "nearest" });
  }, [activeId]);

  return createPortal(
    <div ref={panel} role="menu" aria-label="Turn into" onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onContextMenu={(event) => event.preventDefault()} className={clsx("fixed z-50 max-h-[70vh] w-56 overflow-y-auto rounded-lg", "border border-ink/20 bg-surface shadow-lg", "p-1 text-sm text-ink")}>
      {blockCommands.map((command) => {
        const active = command.id === activeId;
        const applied = command.isActive(editor);
        return (
          <button key={command.id} type="button" role="menuitem" tabIndex={-1} id={`turn-into-${command.id}`} aria-pressed={applied} onMouseEnter={() => onHoverItem(command.id)} onClick={() => onSelect(command.id)} className={clsx("flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left", active && "outline-2 outline-offset-[-2px] outline-ink", applied ? "bg-ink/10" : "hover:bg-ink/5")}>
            {blockIcons[command.id]}
            <span className={clsx("min-w-0 flex-1 truncate")}>{command.label}</span>
            {applied && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={clsx("shrink-0")}><path d="M20 6 9 17l-5-5" /></svg>}
          </button>
        );
      })}
    </div>, document.body,
  );
}
