import clsx from "clsx";
import type { ReactNode } from "react";

export type ReelMotion = "still" | "turning" | "held";

/**
 * The cassette recordings and read-aloud are drawn as: a label strip,
 * the tape window between two reels, and a row of keys.
 */
export default function CassetteDeck({
  label,
  recording = false,
  timer,
  wound,
  reels,
  tape,
  controls
}: Readonly<{
  /** What is written on the cassette's label. */
  label: ReactNode;
  /** Lights the red dot on the label. */
  recording?: boolean;
  timer: string;
  /** How far the tape has run from the left reel to the right one, from 0 to 1. */
  wound: number;
  /** Held keeps a reel's angle where it stopped, so a pause reads as a pause. */
  reels: ReelMotion;
  /** What shows through the window between the reels. */
  tape: ReactNode;
  /** The deck's keys, so pressing one is pressing the recorder itself. */
  controls: ReactNode;
}>) {
  const turning = reels !== "still";

  return (
    <div className={clsx("w-full rounded-lg border border-ink/15 bg-ink/5 p-2")}>
      <div
        className={clsx(
          "flex items-center gap-2 rounded-md border-l-4 border-chain-lime",
          "bg-chain-cream px-3 py-1.5 text-chain-navy"
        )}
      >
        <span
          aria-hidden="true"
          className={clsx(
            "size-2 shrink-0 rounded-full",
            recording ? "bg-red-600 motion-safe:animate-pulse" : "bg-chain-navy/25"
          )}
        />
        <div className={clsx("min-w-0 truncate text-sm font-medium")}>{label}</div>
        <span aria-hidden="true" className={clsx("h-3 flex-1 border-b border-dashed border-chain-navy/25")} />
        <span className={clsx("font-mono text-sm tabular-nums")} role="timer" aria-live="off">
          {timer}
        </span>
      </div>
      <div
        aria-hidden="true"
        className={clsx(
          "mt-2 flex items-center gap-2 rounded-full border border-chain-cream/10",
          "bg-chain-navy px-1.5 py-1"
        )}
      >
        <Reel tape={1 - wound} turning={turning} paused={reels === "held"} />
        {tape}
        <Reel tape={wound} turning={turning} paused={reels === "held"} />
      </div>
      {/* Unselectable: inserting the block selects it, and the global
          ::selection colour would otherwise repaint anything in here. */}
      <div className={clsx("mt-2 flex select-none items-center gap-1.5")}>{controls}</div>
    </div>
  );
}

export const deckIcons = {
  play: "M8 5v14l11-7z",
  pause: "M9 5v14M15 5v14",
  back: "M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5",
  forward: "M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5",
  previous: "M6 5v14M18 6l-8 6 8 6V6Z",
  next: "M18 5v14M6 6l8 6-8 6V6Z",
  close: "M18 6 6 18M6 6l12 12",
  check: "M20 6 9 17l-5-5",
  rename: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  trash: "M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3",
  volume: "M11 5 6 9H3v6h3l5 4zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13",
  muted: "M11 5 6 9H3v6h3l5 4zM22 9l-6 6M16 9l6 6"
};

export function DeckIcon({ name }: Readonly<{ name: keyof typeof deckIcons }>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={deckIcons[name]} />
    </svg>
  );
}

const keyTones = {
  neutral: "border-ink/15 bg-surface text-ink hover:bg-ink/5",
  primary: "border-transparent bg-action text-on-action hover:bg-action/85",
  quiet: "border-transparent text-muted hover:bg-ink/5 hover:text-ink",
  danger: "border-transparent text-muted hover:bg-danger/10 hover:text-danger"
};

/** One key on the deck: an icon, with its action as the tooltip and accessible name. */
export function DeckKey({
  label,
  tone = "neutral",
  disabled,
  onClick,
  children
}: Readonly<{
  label: string;
  tone?: keyof typeof keyTones;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}>) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "grid size-8 shrink-0 place-items-center rounded-md border",
        keyTones[tone],
        "motion-safe:transition-transform motion-safe:active:translate-y-px",
        "focus-visible:outline-2 focus-visible:outline-ink"
      )}
    >
      {children}
    </button>
  );
}

function Reel({ tape, turning, paused }: Readonly<{ tape: number; turning: boolean; paused: boolean }>) {
  return (
    <svg viewBox="0 0 40 40" className={clsx("size-10 shrink-0")}>
      <circle cx="20" cy="20" r={10 + tape * 9} className={clsx("fill-chain-cream/25")} />
      <g
        className={clsx("origin-center", turning && "animate-reel motion-reduce:animate-none")}
        style={{ animationPlayState: paused ? "paused" : "running" }}
      >
        <circle cx="20" cy="20" r="8" className={clsx("fill-chain-navy stroke-chain-cream/70")} strokeWidth="1.5" />
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <rect
            key={angle}
            x="19"
            y="12.5"
            width="2"
            height="3"
            rx="0.5"
            transform={`rotate(${angle} 20 20)`}
            className={clsx("fill-chain-cream/70")}
          />
        ))}
        <circle cx="20" cy="20" r="2" className={clsx("fill-chain-cream/70")} />
      </g>
    </svg>
  );
}
