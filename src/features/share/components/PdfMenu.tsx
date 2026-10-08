import { usePdfExport } from "@/features/share/lib/usePdfExport";
import { hideUntilPlaced, placePopover } from "@/shared/lib/placePopover";
import clsx from "clsx";
import { useId, useRef, type ToggleEvent } from "react";

const itemClass = clsx(
  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left",
  "hover:bg-ink/7 focus-visible:bg-ink/7 focus-visible:outline-none"
);

export default function PdfMenu({
  name,
  build,
  disabledReason,
  onError
}: Readonly<{
  name: string;
  build: () => Promise<string> | string;
  disabledReason?: string;
  onError: (message: string | null) => void;
}>) {
  const id = useId();
  const menu = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const { busy, share, save } = usePdfExport(name, build, onError);

  function placeMenu(event: ToggleEvent<HTMLDivElement>) {
    if (event.newState !== "open" || !trigger.current) return;
    placePopover(event.currentTarget, trigger.current, "start");
    event.currentTarget.querySelector("button")?.focus({ preventScroll: true });
  }

  function choose(action: () => void) {
    menu.current?.hidePopover();
    action();
  }

  return (
    <>
      <button
        ref={trigger}
        type="button"
        popoverTarget={id}
        disabled={busy !== null || disabledReason !== undefined}
        title={disabledReason}
        className={clsx(
          "flex items-center gap-1.5 rounded-md border border-ink/15 px-4 py-2 text-sm font-medium",
          "hover:bg-ink/5 disabled:opacity-40 disabled:hover:bg-transparent"
        )}
      >
        {busy === "share" && "Sharing…"}
        {busy === "save" && "Saving…"}
        {busy === null && "PDF"}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      <div
        ref={menu}
        id={id}
        popover="auto"
        onBeforeToggle={(event) => hideUntilPlaced(event.currentTarget, event.newState)}
        onToggle={placeMenu}
        className={clsx("fixed m-0 w-44 rounded-lg", "border border-ink/20 bg-surface shadow-lg", "p-1 text-sm text-ink")}
      >
        <button type="button" onClick={() => choose(() => trigger.current && share(trigger.current))} className={itemClass}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
          </svg>
          Share…
        </button>
        <button type="button" onClick={() => choose(save)} className={itemClass}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
          </svg>
          Save…
        </button>
      </div>
    </>
  );
}
