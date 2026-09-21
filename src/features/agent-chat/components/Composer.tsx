import { useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import clsx from "clsx";
import { BodyText } from "../../../shared/ui/Typography";
import { matchModelCommand } from "../lib/commands";

export default function Composer({ busy, stopping, supported, ready, custom, modelCommand, modelHint, modelOptions, onSend, onStop }: Readonly<{
  busy: boolean;
  stopping: boolean;
  supported: boolean;
  ready: boolean;
  custom: boolean;
  modelCommand: boolean;
  modelHint: string;
  modelOptions: string[];
  onSend: (message: string) => Promise<void>;
  onStop: () => Promise<void>;
}>) {
  const [message, setMessage] = useState("");
  const [highlight, setHighlight] = useState(0);
  const input = useRef<HTMLTextAreaElement>(null);
  const hintId = useId();
  const menuId = useId();

  const modelArgs = modelCommand ? matchModelCommand(message) : null;
  const menuOptions = modelArgs === null || !modelOptions.length ? [] : [
    ...modelOptions.filter((option) => option.startsWith(modelArgs.toLowerCase())),
    ...("default".startsWith(modelArgs.toLowerCase()) ? ["default"] : []),
  ];
  const menuOpen = menuOptions.length > 0;
  const activeIndex = Math.min(highlight, menuOptions.length - 1);

  useEffect(() => { setHighlight(0); }, [menuOptions.join("|")]);
  useLayoutEffect(() => {
    if (!input.current) return;
    input.current.style.height = "auto";
    input.current.style.height = `${input.current.scrollHeight}px`;
  }, [message]);

  function submit(text: string) {
    if (!text.trim() || busy || !supported || !ready) return;
    void onSend(text);
    setMessage("");
  }

  function selectOption(option: string) {
    submit(option === "default" ? "/model" : `/model ${option}`);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (menuOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      setHighlight((current) => (current + delta + menuOptions.length) % menuOptions.length);
      return;
    }
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      if (menuOpen) selectOption(menuOptions[activeIndex]);
      else submit(message);
    }
  }

  return <form onSubmit={(event) => { event.preventDefault(); submit(message); }} className={clsx("shrink-0 space-y-2 pt-3")}>
    {!supported && <BodyText tone="muted">This conversation's agent connection is no longer available.</BodyText>}
    <div className={clsx("relative")}>
      {menuOpen && <ul id={menuId} role="listbox" aria-label="Models" className={clsx("absolute bottom-full left-0 right-0 z-10 mb-2 max-h-48 overflow-y-auto rounded-md", "border border-ink/15 bg-surface p-1 text-sm shadow-lg")}>
        {menuOptions.map((option, index) => <li key={option} role="option" aria-selected={index === activeIndex}>
          <button type="button" tabIndex={-1} onMouseEnter={() => setHighlight(index)} onClick={() => selectOption(option)}
            className={clsx("block w-full rounded-md px-3 py-2 text-left capitalize", index === activeIndex ? "bg-ink/10" : "hover:bg-ink/5")}>
            {option === "default" ? "Default" : option}
          </button>
        </li>)}
      </ul>}
      <div className={clsx("flex items-end gap-2 rounded-2xl bg-ink/3 border border-ink/15 p-2", "focus-within:border-ink/40")}>
        <textarea ref={input} aria-label="Message" aria-describedby={hintId} rows={1}
          aria-expanded={menuOpen} aria-controls={menuOpen ? menuId : undefined}
          placeholder={busy ? "Waiting for a response…" : "Message your agent…"}
          disabled={busy || !supported || !ready} value={message} onChange={(event) => setMessage(event.target.value)}
          className={clsx("min-h-10 max-h-48 min-w-0 flex-1 resize-none bg-transparent", "px-3 py-2 text-sm leading-6 text-ink placeholder:text-muted", "focus:outline-none disabled:opacity-60")}
          onKeyDown={handleKeyDown} />
        {busy ? <button type="button" aria-label={stopping ? "Stopping…" : "Stop generating"} title={stopping ? "Stopping…" : "Stop generating"}
          disabled={stopping} onClick={() => void onStop()}
          className={clsx("flex size-10 shrink-0 items-center justify-center rounded-full bg-action text-on-action", "hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40")}>
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={clsx("size-5")}><rect x="5" y="5" width="10" height="10" rx="1" /></svg>
        </button> : <button type="submit" aria-label="Send message" title="Send message" disabled={!message.trim() || !supported || !ready}
          className={clsx("flex size-10 shrink-0 items-center justify-center rounded-full", "bg-action text-on-action disabled:bg-ink/8 disabled:text-muted", "hover:enabled:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2")}>
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={clsx("size-5")}><path d="M10 15V5m-5 5 5-5 5 5" /></svg>
        </button>}
      </div>
    </div>
    <p id={hintId} className={clsx("px-3 text-xs leading-5 text-muted")}>
      {modelArgs !== null && modelHint ? modelHint
        : custom ? "This agent receives only this message, without the conversation history."
        : modelCommand ? "Enter to send · Shift + Enter for a new line · /model <name> to change the model"
        : "Enter to send · Shift + Enter for a new line"}
    </p>
  </form>;
}
