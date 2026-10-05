import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import clsx from "clsx";
import { SectionTitle } from "./Typography";

// Where the dialog grows from and shrinks back into: its keyframes map
// the dialog's own box onto `origin`'s, scaled uniformly so text doesn't
// stretch, fading in fast enough that the scaled-down content never reads.
function morphFrom(dialog: HTMLElement, origin: HTMLElement): Keyframe[] {
  const from = origin.getBoundingClientRect();
  const to = dialog.getBoundingClientRect();
  const dx = from.left + from.width / 2 - (to.left + to.width / 2);
  const dy = from.top + from.height / 2 - (to.top + to.height / 2);
  const scale = Math.min(1, from.width / to.width);
  return [
    { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0 },
    { opacity: 1, offset: 0.35 },
    { transform: "none", opacity: 1 },
  ];
}

// How long closing takes; matches .app-dialog in App.css.
const CLOSE_MS = 160;

const complete = (callback: () => void) => callback();

const reducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function Dialog({ open, title, children, onClose, busy = false, origin, wide = false }: Readonly<{
  open: boolean;
  title: string;
  children: (close: () => void, complete: (callback: () => void) => void) => ReactNode;
  onClose: () => void;
  busy?: boolean;
  origin?: RefObject<HTMLElement | null>;
  wide?: boolean;
}>) {
  const ref = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [closing, setClosing] = useState(false);
  const titleId = useId();
  const { pathname } = useLocation();
  const openedAt = useRef(pathname);

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    clearTimeout(timer.current);
    if (open) {
      setClosing(false);
      if (!dialog.open) dialog.showModal();
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
      dialog.dataset.visible = "true";
      if (!reducedMotion()) {
        if (origin?.current) dialog.animate(morphFrom(dialog, origin.current), { duration: 240, easing: "cubic-bezier(0.2, 0, 0, 1)" });
        else dialog.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: "cubic-bezier(0, 0, 0.2, 1)" });
      }
      return;
    }
    if (!dialog.open) return;
    dialog.dataset.visible = "false";
    if (reducedMotion()) {
      dialog.close();
      return;
    }
    if (origin) {
      const frames = origin.current ? morphFrom(dialog, origin.current).reverse() : [{ opacity: 1 }, { opacity: 0 }];
      dialog.animate(frames, { duration: CLOSE_MS, easing: "cubic-bezier(0.3, 0, 1, 1)" });
    }
    setClosing(true);
    timer.current = setTimeout(() => {
      dialog.close();
      setClosing(false);
    }, CLOSE_MS);
  }, [open]);

  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (open) openedAt.current = pathname;
  }, [open]);

  useEffect(() => {
    if (open && pathname !== openedAt.current) onClose();
  }, [pathname]);

  function close() {
    if (busy || closing) return;
    onClose();
  }

  return createPortal(
    <dialog ref={ref} aria-labelledby={titleId} inert={!open} data-closing={closing} data-morph={origin ? "true" : undefined} onCancel={(event) => { event.preventDefault(); close(); }} className={clsx("app-dialog fixed inset-0 m-auto max-h-11/12 max-w-11/12 overflow-y-auto", wide ? "w-4xl" : "w-lg", "rounded-xl border border-ink/15 bg-surface text-ink p-6 sm:p-8", "backdrop:bg-chain-navy/72")}>
      <div className={clsx("mb-6 flex items-center justify-between gap-4")}>
        <SectionTitle id={titleId}>{title}</SectionTitle>
        <button type="button" onClick={close} disabled={busy || closing} aria-label="Close dialog" className={clsx("size-8 rounded-md text-xl text-muted", "hover:bg-ink/5")}>×</button>
      </div>
      {children(close, complete)}
    </dialog>,
    document.body
  );
}
