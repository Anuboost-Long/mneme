import { autoUpdate, computePosition, flip, offset, shift } from "@floating-ui/dom";
import clsx from "clsx";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { BodyText, Caption } from "./Typography";

export type TourStep = { target: string; title: string; body: string };

const targetOf = (step: TourStep) =>
  document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);

export default function Tour({
  steps,
  onClose
}: Readonly<{ steps: TourStep[]; onClose: () => void }>) {
  const titleId = useId();
  const bodyId = useId();
  const card = useRef<HTMLDialogElement>(null);
  const spotlight = useRef<HTMLDivElement>(null);
  const primary = useRef<HTMLButtonElement>(null);
  const [shown] = useState(() => steps.filter((step) => targetOf(step)));
  const [index, setIndex] = useState(0);
  const step = shown[index];
  const last = index === shown.length - 1;

  useEffect(() => {
    if (shown.length === 0) onClose();
  }, []);

  useLayoutEffect(() => {
    const target = step && targetOf(step);
    if (!target || !card.current || !spotlight.current) return;
    const tooltip = card.current;
    const highlight = spotlight.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
    primary.current?.focus({ preventScroll: true });
    return autoUpdate(target, tooltip, () => {
      const { left, top, width, height } = target.getBoundingClientRect();
      Object.assign(highlight.style, {
        left: `${left - 6}px`,
        top: `${top - 6}px`,
        width: `${width + 12}px`,
        height: `${height + 12}px`
      });
      void computePosition(target, tooltip, {
        strategy: "fixed",
        placement: "bottom",
        middleware: [offset(16), flip({ padding: 12 }), shift({ padding: 12 })]
      }).then(({ x, y }) => {
        Object.assign(tooltip.style, { left: `${x}px`, top: `${y}px`, visibility: "visible" });
      });
    });
  }, [step]);

  useEffect(() => {
    function skipOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", skipOnEscape);
    return () => document.removeEventListener("keydown", skipOnEscape);
  }, [onClose]);

  if (!step) return null;

  return createPortal(
    <>
      <div ref={spotlight} aria-hidden="true" className={clsx("tour-spotlight")} />
      <dialog
        open
        ref={card}
        aria-labelledby={titleId}
        aria-describedby={bodyId}
        className={clsx(
          "invisible fixed inset-auto z-50 m-0 w-80",
          "rounded-lg border border-ink/15 bg-surface shadow-lg",
          "p-4 text-ink"
        )}
      >
        <Caption tone="muted">
          {index + 1} of {shown.length}
        </Caption>
        <BodyText as="h2" id={titleId} className={clsx("mt-1 font-medium")}>
          {step.title}
        </BodyText>
        <BodyText id={bodyId} tone="muted" className={clsx("mt-1")}>
          {step.body}
        </BodyText>
        <div className={clsx("mt-4 flex items-center gap-2")}>
          {!last && (
            <button
              type="button"
              onClick={onClose}
              className={clsx(
                "mr-auto text-sm text-muted underline underline-offset-4",
                "hover:text-ink"
              )}
            >
              Skip tour
            </button>
          )}
          {index > 0 && (
            <button
              type="button"
              onClick={() => setIndex(index - 1)}
              className={clsx(
                "rounded-md border border-ink/15 px-3 py-1.5 text-sm",
                last && "ml-auto",
                "hover:bg-ink/5"
              )}
            >
              Back
            </button>
          )}
          <button
            ref={primary}
            type="button"
            onClick={() => (last ? onClose() : setIndex(index + 1))}
            className={clsx(
              "rounded-md bg-action px-3 py-1.5 text-sm font-medium text-on-action",
              last && index === 0 && "ml-auto",
              "hover:bg-action/85"
            )}
          >
            {last ? "Done" : "Next"}
          </button>
        </div>
      </dialog>
    </>,
    document.body
  );
}
