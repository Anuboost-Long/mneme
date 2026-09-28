import { useRef } from "react";
import clsx from "clsx";

export default function TruncatedText({ text, className }: Readonly<{
  text: string;
  className?: string;
}>) {
  const label = useRef<HTMLSpanElement>(null);
  const tooltip = useRef<HTMLSpanElement>(null);

  function show() {
    const element = label.current;
    if (!element || !tooltip.current || element.scrollWidth <= element.clientWidth) return;
    const bounds = element.getBoundingClientRect();
    tooltip.current.style.left = `${bounds.left}px`;
    tooltip.current.style.top = `${bounds.bottom + 6}px`;
    tooltip.current.showPopover();
  }

  function hide() {
    if (tooltip.current?.matches(":popover-open")) tooltip.current.hidePopover();
  }

  return (
    <>
      <span ref={label} onPointerEnter={show} onPointerLeave={hide} className={clsx("truncate", className)}>{text}</span>
      <span ref={tooltip} popover="manual" aria-hidden="true" className={clsx("fixed m-0 max-w-72 rounded-md px-2.5 py-1.5", "bg-ink text-xs leading-5 text-surface shadow-lg", "pointer-events-none")}>{text}</span>
    </>
  );
}
