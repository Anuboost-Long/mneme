import type { Editor } from "@tiptap/react";
import clsx from "clsx";
import { useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

import { Caption } from "../../../../shared/ui/Typography";
import type { ReadableChunk } from "../../../read-aloud/lib/readableText";
import { blockCommands } from "./blockCommands";
import { markCommands } from "./markCommands";
import TurnIntoSubmenu from "./TurnIntoSubmenu";

const GRID_COLUMNS = 4;
const HOVER_CLOSE_DELAY = 150;

const gridIds = [...markCommands.map((command) => `mark-${command.id}`), "link"];

// One chunk per textblock the selection touches, each with the DOM range
// its text sits in, so read-aloud can highlight the word being read.
function selectionChunks(editor: Editor): ReadableChunk[] {
  const { from, to } = editor.state.selection;
  const chunks: ReadableChunk[] = [];
  editor.state.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock) return true;
    const start = editor.view.domAtPos(Math.max(from, pos + 1));
    const end = editor.view.domAtPos(Math.min(to, pos + node.nodeSize - 1));
    const range = document.createRange();
    range.setStart(start.node, start.offset);
    range.setEnd(end.node, end.offset);
    chunks.push({ text: range.toString(), range });
    return false;
  });
  return chunks;
}

export default function SelectionMenu({
  editor,
  position,
  onClose,
  onLink,
  onReadAloud
}: Readonly<{
  editor: Editor;
  position: { x: number; y: number };
  onClose: () => void;
  onLink: () => void;
  onReadAloud?: (texts: ReadableChunk[]) => void;
}>) {
  const menu = useRef<HTMLMenuElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const closeSubmenuTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [activeMain, setActiveMain] = useState<string>("toggle");
  const [submenuOpen, setSubmenuOpen] = useState(false);
  const [activeBlock, setActiveBlock] = useState(
    () => blockCommands.find((command) => command.isActive(editor))?.id ?? blockCommands[0].id
  );

  useLayoutEffect(() => {
    if (!menu.current) return;
    const element = menu.current;
    const bounds = element.getBoundingClientRect();
    element.style.left = `${Math.max(8, Math.min(position.x, window.innerWidth - bounds.width - 8))}px`;
    element.style.top = `${Math.max(8, Math.min(position.y, window.innerHeight - bounds.height - 8))}px`;
    element.focus();
    function dismissOnOutside(event: Event) {
      if (event.target instanceof Node && element.contains(event.target)) return;
      onClose();
    }
    document.addEventListener("pointerdown", dismissOnOutside);
    window.addEventListener("resize", onClose);
    window.addEventListener("scroll", dismissOnOutside, true);
    return () => {
      document.removeEventListener("pointerdown", dismissOnOutside);
      window.removeEventListener("resize", onClose);
      window.removeEventListener("scroll", dismissOnOutside, true);
    };
  }, [position, onClose]);

  function openSubmenu() {
    if (closeSubmenuTimeout.current) clearTimeout(closeSubmenuTimeout.current);
    setActiveMain("toggle");
    setSubmenuOpen(true);
  }

  function scheduleCloseSubmenu() {
    if (closeSubmenuTimeout.current) clearTimeout(closeSubmenuTimeout.current);
    closeSubmenuTimeout.current = setTimeout(() => setSubmenuOpen(false), HOVER_CLOSE_DELAY);
  }

  function runMain(id: string) {
    if (id === "link") {
      onLink();
      onClose();
      return;
    }
    if (id === "read") {
      onReadAloud?.(selectionChunks(editor));
      onClose();
      return;
    }
    const command = markCommands.find((item) => `mark-${item.id}` === id);
    if (command) {
      command.run(editor);
      onClose();
    }
  }

  function runBlock(id: string) {
    blockCommands.find((command) => command.id === id)?.run(editor);
    onClose();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (submenuOpen) {
      const index = blockCommands.findIndex((command) => command.id === activeBlock);
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setActiveBlock(blockCommands[(index + 1) % blockCommands.length].id);
          break;
        case "ArrowUp":
          event.preventDefault();
          setActiveBlock(
            blockCommands[(index - 1 + blockCommands.length) % blockCommands.length].id
          );
          break;
        case "Home":
          event.preventDefault();
          setActiveBlock(blockCommands[0].id);
          break;
        case "End":
          event.preventDefault();
          setActiveBlock(blockCommands[blockCommands.length - 1].id);
          break;
        case "ArrowLeft":
          event.preventDefault();
          setSubmenuOpen(false);
          break;
        case "Enter":
        case " ":
          event.preventDefault();
          runBlock(activeBlock);
          break;
        case "Escape":
          event.preventDefault();
          setSubmenuOpen(false);
          break;
      }
      return;
    }

    const onToggle = activeMain === "toggle";
    const onRead = activeMain === "read";
    const gridIndex = gridIds.indexOf(activeMain);
    const lastRowStart = Math.floor((gridIds.length - 1) / GRID_COLUMNS) * GRID_COLUMNS;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (onToggle) setActiveMain(gridIds[0]);
        else if (onRead) break;
        else if (gridIndex + GRID_COLUMNS < gridIds.length)
          setActiveMain(gridIds[gridIndex + GRID_COLUMNS]);
        else if (onReadAloud) setActiveMain("read");
        break;
      case "ArrowUp":
        event.preventDefault();
        if (onRead) setActiveMain(gridIds[lastRowStart]);
        else if (!onToggle)
          gridIndex - GRID_COLUMNS >= 0
            ? setActiveMain(gridIds[gridIndex - GRID_COLUMNS])
            : setActiveMain("toggle");
        break;
      case "ArrowRight":
        event.preventDefault();
        if (onToggle) openSubmenu();
        else if (!onRead) setActiveMain(gridIds[(gridIndex + 1) % gridIds.length]);
        break;
      case "ArrowLeft":
        if (!onToggle && !onRead) {
          event.preventDefault();
          setActiveMain(gridIds[(gridIndex - 1 + gridIds.length) % gridIds.length]);
        }
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        onToggle ? openSubmenu() : runMain(activeMain);
        break;
      case "Home":
        event.preventDefault();
        setActiveMain("toggle");
        break;
      case "End":
        event.preventDefault();
        setActiveMain(onReadAloud ? "read" : gridIds[gridIds.length - 1]);
        break;
      case "Escape":
        event.preventDefault();
        onClose();
        break;
    }
  }

  const currentBlock = blockCommands.find((command) => command.isActive(editor));
  const highlight = (id: string) =>
    id === activeMain && !submenuOpen ? clsx("outline-2 outline-offset-[-2px] outline-ink") : "";

  return createPortal(
    <>
      <menu
        ref={menu}
        role="menu"
        tabIndex={0}
        aria-label="Format selection"
        aria-activedescendant={submenuOpen ? undefined : `selection-${activeMain}`}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={handleKeyDown}
        className={clsx(
          "fixed z-50 m-0 w-64 max-w-11/12 list-none rounded-lg",
          "border border-ink/20 bg-surface shadow-lg",
          "p-1 text-sm text-ink",
          "focus:outline-none"
        )}
        style={{ left: position.x, top: position.y }}
      >
        <li role="none">
          <button
            ref={toggle}
            type="button"
            role="menuitem"
            id="selection-toggle"
            tabIndex={-1}
            aria-expanded={submenuOpen}
            onMouseEnter={() => {
              setActiveMain("toggle");
              openSubmenu();
            }}
            onMouseLeave={scheduleCloseSubmenu}
            onClick={() => (submenuOpen ? setSubmenuOpen(false) : openSubmenu())}
            className={clsx(
              "flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left",
              highlight("toggle"),
              "hover:bg-ink/7"
            )}
          >
            <span className={clsx("flex min-w-0 items-center gap-2")}>
              <Caption as="span" tone="muted">
                Turn into
              </Caption>
              <span className={clsx("truncate font-medium")}>{currentBlock?.label ?? "Text"}</span>
            </span>
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
              className={clsx("shrink-0")}
            >
              <path d="m9 6 6 6-6 6" />
            </svg>
          </button>
        </li>
        <li role="none" className={clsx("my-1 border-t border-ink/10")} />
        <li role="none" className={clsx("grid grid-cols-4 gap-1 px-1 py-1")}>
          {markCommands.map((command) => {
            const id = `mark-${command.id}`;
            return (
              <button
                key={id}
                type="button"
                role="menuitem"
                id={`selection-${id}`}
                tabIndex={-1}
                aria-label={command.hint}
                aria-pressed={command.isActive(editor)}
                onMouseEnter={() => setActiveMain(id)}
                onClick={() => runMain(id)}
                className={clsx(
                  "flex items-center justify-center rounded-md py-2 text-sm",
                  command.className,
                  highlight(id),
                  command.isActive(editor)
                    ? "bg-ink/10 text-ink"
                    : "text-muted hover:bg-ink/5 hover:text-ink"
                )}
              >
                {command.label}
              </button>
            );
          })}
          <button
            type="button"
            role="menuitem"
            id="selection-link"
            tabIndex={-1}
            aria-label="Link"
            aria-pressed={editor.isActive("link")}
            onMouseEnter={() => setActiveMain("link")}
            onClick={() => runMain("link")}
            className={clsx(
              "flex items-center justify-center rounded-md py-2",
              highlight("link"),
              editor.isActive("link")
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
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </button>
        </li>
        {onReadAloud && (
          <>
            <li role="none" className={clsx("my-1 border-t border-ink/10")} />
            <li role="none">
              <button
                type="button"
                role="menuitem"
                id="selection-read"
                tabIndex={-1}
                onMouseEnter={() => setActiveMain("read")}
                onClick={() => runMain("read")}
                className={clsx(
                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left",
                  highlight("read"),
                  "hover:bg-ink/7"
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
                  className={clsx("shrink-0")}
                >
                  <path d="M11 5 6 9H3v6h3l5 4V5ZM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
                </svg>
                Read aloud
              </button>
            </li>
          </>
        )}
      </menu>
      {submenuOpen && toggle.current && (
        <TurnIntoSubmenu
          editor={editor}
          anchor={toggle.current.getBoundingClientRect()}
          activeId={activeBlock}
          onHoverItem={setActiveBlock}
          onSelect={runBlock}
          onMouseEnter={() =>
            closeSubmenuTimeout.current && clearTimeout(closeSubmenuTimeout.current)
          }
          onMouseLeave={scheduleCloseSubmenu}
        />
      )}
    </>,
    document.body
  );
}
