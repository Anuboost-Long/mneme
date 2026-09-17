import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import clsx from "clsx";
import type { BlockCommand } from "./blockCommands";

export type SlashMenuHandle = { onKeyDown: (event: KeyboardEvent) => boolean };

const SlashMenu = forwardRef<SlashMenuHandle, Readonly<{
  items: BlockCommand[];
  command: (item: BlockCommand) => void;
}>>(function SlashMenu({ items, command }, ref) {
  const list = useRef<HTMLUListElement>(null);
  const [selected, setSelected] = useState(0);

  useEffect(() => setSelected(0), [items]);

  useEffect(() => {
    list.current?.children[selected]?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  useImperativeHandle(ref, () => ({
    onKeyDown(event) {
      if (items.length === 0) return false;
      if (event.key === "ArrowDown") { setSelected((index) => (index + 1) % items.length); return true; }
      if (event.key === "ArrowUp") { setSelected((index) => (index + items.length - 1) % items.length); return true; }
      if (event.key === "Enter") {
        const item = items[selected];
        if (item) command(item);
        return true;
      }
      return false;
    },
  }), [items, selected, command]);

  if (items.length === 0) {
    return <div className={clsx("w-56 rounded-lg border border-ink/20 bg-surface p-3 text-sm text-muted shadow-lg")}>No matches</div>;
  }

  return (
    <ul ref={list} role="listbox" aria-label="Insert" className={clsx("max-h-72 w-56 overflow-y-auto rounded-lg", "border border-ink/20 bg-surface shadow-lg", "p-1 text-sm text-ink")}>
      {items.map((item, index) => (
        <li key={item.id} role="option" aria-selected={index === selected}>
          <button type="button" onClick={() => command(item)} onMouseEnter={() => setSelected(index)} className={clsx("flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left", index === selected ? "bg-ink/10" : "hover:bg-ink/5")}>
            <span>{item.label}</span>
            <span className={clsx("text-xs text-muted")}>{item.hint}</span>
          </button>
        </li>
      ))}
    </ul>
  );
});

export default SlashMenu;
