import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { SectionTitle } from "./Typography";

export default function Dialog({ title, children, onClose, busy = false }: Readonly<{
  title: string;
  children: (close: () => void, complete: (callback: () => void) => void) => ReactNode;
  onClose: () => void;
  busy?: boolean;
}>) {
  const ref = useRef<HTMLDialogElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const completing = useRef(false);
  const [closing, setClosing] = useState(false);
  const titleId = useId();

  useLayoutEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    if (dialog) getComputedStyle(dialog).opacity;
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
    setClosing(true);
    timer.current = setTimeout(callback, 300);
  }

  return (
    <dialog ref={ref} aria-labelledby={titleId} inert={closing} data-closing={closing} onCancel={(event) => { event.preventDefault(); close(); }} className={clsx("app-dialog fixed inset-0 m-auto max-h-11/12 w-lg max-w-11/12 overflow-y-auto", "rounded-xl border border-ink/15 bg-surface text-ink p-6 sm:p-8", "backdrop:bg-chain-navy/68 backdrop:backdrop-blur-[2px]")}>
      <div className={clsx("mb-6 flex items-center justify-between gap-4")}>
        <SectionTitle id={titleId}>{title}</SectionTitle>
        <button type="button" onClick={close} disabled={busy || closing} aria-label="Close dialog" className={clsx("size-8 rounded-md text-xl text-muted", "hover:bg-ink/5")}>×</button>
      </div>
      {children(close, complete)}
    </dialog>
  );
}
