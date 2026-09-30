import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import clsx from "clsx";
import type { SlashItem } from "./blockCommands";

export type SlashMenuHandle = { onKeyDown: (event: KeyboardEvent) => boolean };

const SlashMenu = forwardRef<SlashMenuHandle, Readonly<{
  items: SlashItem[];
  command: (item: SlashItem) => void;
}>>(function SlashMenu({ items, command }, ref) {
  const list = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(0);

  useEffect(() => setSelected(0), [items]);

  useEffect(() => {
    list.current?.querySelectorAll('[role="option"]')[selected]?.scrollIntoView({ block: "nearest" });
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

  // Items arrive ordered by category; each run of one category is a group.
  const groups = items.reduce<{ category: string; entries: { item: SlashItem; index: number }[] }[]>((all, item, index) => {
    const last = all[all.length - 1];
    if (last?.category === item.category) last.entries.push({ item, index });
    else all.push({ category: item.category, entries: [{ item, index }] });
    return all;
  }, []);

  return (
    <div ref={list} role="listbox" aria-label="Insert" className={clsx("max-h-80 w-64 overflow-y-auto rounded-lg", "border border-ink/20 bg-surface shadow-lg", "p-1 text-sm text-ink")}>
      {groups.map((group) => (
        <div key={group.category} role="group" aria-label={group.category}>
          <div aria-hidden="true" className={clsx("px-3 pt-2 pb-1 text-xs font-medium text-muted")}>{group.category}</div>
          <ul className={clsx("m-0 list-none p-0")}>
            {group.entries.map(({ item, index }) => (
              <li key={item.id} role="option" aria-selected={index === selected}>
                <button type="button" onClick={() => command(item)} onMouseEnter={() => setSelected(index)} className={clsx("flex w-full flex-col items-start gap-0.5 rounded-md px-3 py-2 text-left", index === selected ? "bg-ink/10" : "hover:bg-ink/5")}>
                  <span>{item.label}</span>
                  <span className={clsx("text-xs text-muted")}>{item.hint}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
});

export default SlashMenu;
