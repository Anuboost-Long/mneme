import clsx from "clsx";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { Conversation } from "../lib/conversation/types";
import ConversationForm from "./ConversationForm";

export default function ConversationActions({
  conversation,
  busy,
  onRename,
  onDelete
}: Readonly<{
  conversation: Conversation;
  busy: boolean;
  onRename: (id: number, title: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}>) {
  const [open, setOpen] = useState(false);
  const [action, setAction] = useState<"rename" | "delete" | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLMenuElement>(null);
  const id = useId();
  const label = `Actions for ${conversation.title ?? "New conversation"}`;

  useLayoutEffect(() => {
    if (!open || !menu.current || !trigger.current) return;
    const element = menu.current;
    const bounds = trigger.current.getBoundingClientRect();
    element.style.left = `${Math.max(8, Math.min(bounds.right - element.offsetWidth, window.innerWidth - element.offsetWidth - 8))}px`;
    element.style.top = `${Math.max(8, Math.min(bounds.bottom + 4, window.innerHeight - element.offsetHeight - 8))}px`;
    element.querySelector<HTMLButtonElement>("button")?.focus();
    function dismiss(event: Event) {
      if (
        event.target instanceof Node &&
        (element.contains(event.target) || trigger.current?.contains(event.target))
      )
        return;
      setOpen(false);
    }
    document.addEventListener("pointerdown", dismiss);
    window.addEventListener("resize", dismiss);
    window.addEventListener("scroll", dismiss, true);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("resize", dismiss);
      window.removeEventListener("scroll", dismiss, true);
    };
  }, [open]);

  function closeMenu() {
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(!open)}
        className={clsx(
          "absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-md",
          "text-muted",
          "hover:bg-ink/10 hover:text-ink focus-visible:outline-1 focus-visible:outline-ink"
        )}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="19" cy="12" r="1.5" />
        </svg>
      </button>
      {open &&
        createPortal(
          <menu
            ref={menu}
            id={id}
            role="menu"
            aria-label={label}
            onKeyDown={(event) => {
              const items = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")
              );
              const index = items.indexOf(document.activeElement as HTMLButtonElement);
              switch (event.key) {
                case "ArrowDown":
                  event.preventDefault();
                  items[(index + 1) % items.length]?.focus();
                  break;
                case "ArrowUp":
                  event.preventDefault();
                  items[(index + items.length - 1) % items.length]?.focus();
                  break;
                case "Home":
                  event.preventDefault();
                  items[0]?.focus();
                  break;
                case "End":
                  event.preventDefault();
                  items[items.length - 1]?.focus();
                  break;
                case "Escape":
                  event.preventDefault();
                  closeMenu();
                  break;
                case "Tab":
                  closeMenu();
                  break;
              }
            }}
            className={clsx(
              "fixed z-50 m-0 w-40 max-w-11/12 list-none rounded-md",
              "bg-surface border border-ink/20",
              "p-1 text-sm text-ink"
            )}
          >
            {(["rename", "delete"] as const).map((item) => (
              <li key={item} role="none">
                <button
                  type="button"
                  role="menuitem"
                  tabIndex={-1}
                  disabled={item === "delete" && busy}
                  onClick={() => {
                    closeMenu();
                    setAction(item);
                  }}
                  className={clsx(
                    "block w-full rounded px-3 py-2 text-left",
                    item === "delete" && "text-danger",
                    "hover:bg-ink/5 focus-visible:bg-ink/5 focus-visible:outline-none disabled:opacity-50"
                  )}
                >
                  {item === "rename" ? "Rename" : "Delete"}
                </button>
              </li>
            ))}
          </menu>,
          document.body
        )}
      {action && (
        <ConversationForm
          action={action}
          conversation={conversation}
          onRename={onRename}
          onDelete={onDelete}
          onClose={() => setAction(null)}
        />
      )}
    </>
  );
}
