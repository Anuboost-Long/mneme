import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/react";
import clsx from "clsx";
import { findPluginKey } from "./FindInPage";
import { Caption } from "../../../../shared/ui/Typography";

export default function FindBar({ editor, onClose }: Readonly<{
  editor: Editor;
  onClose: () => void;
}>) {
  const [query, setQuery] = useState("");
  const [matchCount, setMatchCount] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { input.current?.focus(); input.current?.select(); }, []);

  useEffect(() => {
    function sync() {
      const found = findPluginKey.getState(editor.state);
      if (!found) return;
      setMatchCount(found.matches.length);
      setActiveIndex(found.active);
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      editor.view.dom.querySelector(".find-match-active")?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
    }
    sync();
    editor.on("transaction", sync);
    return () => { editor.off("transaction", sync); };
  }, [editor]);

  function updateQuery(value: string) {
    setQuery(value);
    editor.commands.setFindQuery(value);
  }

  function close() {
    editor.commands.clearFind();
    onClose();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { event.preventDefault(); close(); return; }
    if (event.key === "Enter") {
      event.preventDefault();
      if (event.shiftKey) editor.commands.findPrevious();
      else editor.commands.findNext();
    }
  }

  return createPortal(
    <div className={clsx("fixed top-20 right-6 z-50 flex items-center gap-1 rounded-lg", "border border-ink/20 bg-surface shadow-lg", "p-1.5 text-sm text-ink")}>
      <input ref={input} type="text" value={query} onChange={(event) => updateQuery(event.target.value)} onKeyDown={handleKeyDown} placeholder="Find in page" className={clsx("h-9 w-48 min-w-0 rounded-md", "border border-ink/20 bg-surface", "px-3 text-sm", "focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink")} />
      <Caption tone="muted" className={clsx("w-12 shrink-0 text-center tabular-nums")}>{query ? (matchCount ? `${activeIndex + 1}/${matchCount}` : "0/0") : ""}</Caption>
      <button type="button" aria-label="Previous match" disabled={matchCount === 0} onClick={() => editor.commands.findPrevious()} className={clsx("flex size-8 shrink-0 items-center justify-center rounded-md text-muted", "hover:bg-ink/5 hover:text-ink disabled:opacity-40")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m18 15-6-6-6 6" /></svg>
      </button>
      <button type="button" aria-label="Next match" disabled={matchCount === 0} onClick={() => editor.commands.findNext()} className={clsx("flex size-8 shrink-0 items-center justify-center rounded-md text-muted", "hover:bg-ink/5 hover:text-ink disabled:opacity-40")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
      </button>
      <button type="button" aria-label="Close find" onClick={close} className={clsx("flex size-8 shrink-0 items-center justify-center rounded-md text-muted", "hover:bg-ink/5 hover:text-ink")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>
    </div>, document.body,
  );
}
