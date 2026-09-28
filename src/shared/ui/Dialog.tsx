import { useId, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
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

export default function Dialog({ title, children, onClose, busy = false, origin }: Readonly<{
  title: string;
  children: (close: () => void, complete: (callback: () => void) => void) => ReactNode;
  onClose: () => void;
  busy?: boolean;
  origin?: RefObject<HTMLElement | null>;
}>) {
  const ref = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const completing = useRef(false);
  const [closing, setClosing] = useState(false);
  const titleId = useId();

  useLayoutEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    dialog?.getBoundingClientRect();
    if (dialog && origin?.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dialog.animate(morphFrom(dialog, origin.current), { duration: 320, easing: "cubic-bezier(0.2, 0, 0, 1)" });
    }
    const frame = requestAnimationFrame(() => { if (dialog && !completing.current) dialog.dataset.visible = "true"; });
    return () => { cancelAnimationFrame(frame); clearTimeout(timer.current); dialog?.close(); };
  }, []);

  function close() {
    if (busy || closing) return;
    complete(onClose);
  }

  function complete(callback: () => void) {
    if (completing.current) return;
    completing.current = true;
    const dialog = ref.current;
    if (!dialog || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { callback(); return; }
    dialog.dataset.visible = "false";
    if (origin) {
      const frames = origin.current ? morphFrom(dialog, origin.current).reverse() : [{ opacity: 1 }, { opacity: 0 }];
      dialog.animate(frames, { duration: 200, easing: "cubic-bezier(0.3, 0, 1, 1)", fill: "forwards" });
    }
    setClosing(true);
    timer.current = setTimeout(callback, 300);
  }

  return (
    <dialog ref={ref} aria-labelledby={titleId} inert={closing} data-closing={closing} data-morph={origin ? "true" : undefined} onCancel={(event) => { event.preventDefault(); close(); }} className={clsx("app-dialog fixed inset-0 m-auto max-h-11/12 w-lg max-w-11/12 overflow-y-auto", "rounded-xl border border-ink/15 bg-surface text-ink p-6 sm:p-8", "backdrop:bg-chain-navy/68 backdrop:backdrop-blur-[2px]")}>
      <div className={clsx("mb-6 flex items-center justify-between gap-4")}>
        <SectionTitle id={titleId}>{title}</SectionTitle>
        <button type="button" onClick={close} disabled={busy || closing} aria-label="Close dialog" className={clsx("size-8 rounded-md text-xl text-muted", "hover:bg-ink/5")}>×</button>
      </div>
      {children(close, complete)}
    </dialog>
  );
}
