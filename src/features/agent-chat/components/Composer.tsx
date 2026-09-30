import { useEffect, useId, useLayoutEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import clsx from "clsx";
import { BodyText } from "../../../shared/ui/Typography";
import { matchModelCommand } from "../lib/commands";
import type { ChatAttachment } from "../lib/attachments";
import type { Attachments } from "../lib/useAttachments";
import AttachmentCard from "./AttachmentCard";

export default function Composer({ files, busy, stopping, supported, ready, custom, modelCommand, modelHint, modelOptions, onSend, onStop }: Readonly<{
  files: Attachments;
  busy: boolean;
  stopping: boolean;
  supported: boolean;
  ready: boolean;
  custom: boolean;
  modelCommand: boolean;
  modelHint: string;
  modelOptions: string[];
  onSend: (message: string, attachments: ChatAttachment[]) => Promise<void>;
  onStop: () => Promise<void>;
}>) {
  const [message, setMessage] = useState("");
  const [highlight, setHighlight] = useState(0);
  const input = useRef<HTMLTextAreaElement>(null);
  const disabled = busy || !supported || !ready;
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
    if (!text.trim() || disabled || files.reading.length) return;
    void onSend(text, files.attachments);
    setMessage("");
    files.clear();
  }

  function attach(list: File[]) {
    if (!disabled) void files.add(list);
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const pasted = Array.from(event.clipboardData.files);
    if (!pasted.length) return;
    event.preventDefault();
    attach(pasted);
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
      <div className={clsx("rounded-2xl bg-ink/3 border border-ink/15 p-2", "focus-within:border-ink/40")}>
        {(files.attachments.length > 0 || files.reading.length > 0) && <ul aria-label="Attached files" className={clsx("flex gap-2 overflow-x-auto p-1 pb-2")}>
          {files.attachments.map((file) => <li key={file.name}>
            <AttachmentCard file={file} onRemove={() => files.remove(file.name)} />
          </li>)}
          {files.reading.map((name) => <li key={`reading-${name}`} role="status" className={clsx("w-56 shrink-0 overflow-hidden rounded-lg border border-ink/10")}>
            <span aria-hidden="true" className={clsx("block h-16 border-b border-ink/10 bg-ink/3 motion-safe:animate-pulse")} />
            <span className={clsx("flex items-center gap-3 px-3 py-2")}>
              <span aria-hidden="true" className={clsx("size-8 shrink-0 rounded-md bg-ink/8")} />
              <span className={clsx("min-w-0")}>
                <span className={clsx("block truncate text-sm font-medium")}>{name}</span>
                <span className={clsx("block text-xs text-muted")}>Reading file…</span>
              </span>
            </span>
          </li>)}
        </ul>}
        <div className={clsx("flex items-end gap-2")}>
        <button type="button" aria-label="Attach files" title="Attach files" disabled={disabled} onClick={() => void files.pick()}
          className={clsx("flex size-10 shrink-0 items-center justify-center rounded-full text-muted", "hover:enabled:bg-ink/6 hover:enabled:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40")}>
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={clsx("size-5")}><path d="m15.5 9.5-5.8 5.8a3.5 3.5 0 0 1-5-5l6.2-6.1a2.3 2.3 0 0 1 3.3 3.2l-6.2 6.2a1.2 1.2 0 0 1-1.6-1.7l5.7-5.7" /></svg>
        </button>
        <textarea ref={input} aria-label="Message" aria-describedby={hintId} rows={1}
          aria-expanded={menuOpen} aria-controls={menuOpen ? menuId : undefined}
          placeholder={busy ? "Waiting for a response…" : "Message your agent…"}
          disabled={disabled} value={message} onChange={(event) => setMessage(event.target.value)} onPaste={handlePaste}
          className={clsx("min-h-10 max-h-48 min-w-0 flex-1 resize-none bg-transparent", "px-3 py-2 text-sm leading-6 text-ink placeholder:text-muted", "focus:outline-none disabled:opacity-60")}
          onKeyDown={handleKeyDown} />
        {busy ? <button type="button" aria-label={stopping ? "Stopping…" : "Stop generating"} title={stopping ? "Stopping…" : "Stop generating"}
          disabled={stopping} onClick={() => void onStop()}
          className={clsx("flex size-10 shrink-0 items-center justify-center rounded-full bg-action text-on-action", "hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-40")}>
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className={clsx("size-5")}><rect x="5" y="5" width="10" height="10" rx="1" /></svg>
        </button> : <button type="submit" aria-label="Send message" title="Send message" disabled={!message.trim() || !supported || !ready || files.reading.length > 0}
          className={clsx("flex size-10 shrink-0 items-center justify-center rounded-full", "bg-action text-on-action disabled:bg-ink/8 disabled:text-muted", "hover:enabled:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2")}>
          <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={clsx("size-5")}><path d="M10 15V5m-5 5 5-5 5 5" /></svg>
        </button>}
        </div>
      </div>
    </div>
    {files.error && <p role="alert" className={clsx("px-3 text-xs leading-5 text-danger")}>{files.error}</p>}
    <p id={hintId} className={clsx("px-3 text-xs leading-5 text-muted")}>
      {modelArgs !== null && modelHint ? modelHint
        : custom ? "This agent receives only this message, without the conversation history."
        : modelCommand ? "Enter to send · Shift + Enter for a new line · /model <name> to change the model"
        : "Enter to send · Shift + Enter for a new line"}
    </p>
  </form>;
}
