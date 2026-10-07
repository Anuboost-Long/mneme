import type { ReactNode } from "react";

type ReelMotion = "still" | "turning" | "held";

export default function AppCassetteDeck({
  label,
  recording = false,
  timer,
  wound,
  reels,
  tape,
  controls
}: Readonly<{
  label: ReactNode;
  recording?: boolean;
  timer: string;
  wound: number;
  reels: ReelMotion;
  tape: ReactNode;
  controls: ReactNode;
}>) {
  const turning = reels !== "still";

  return (
    <div className="w-full rounded-lg border border-ink/15 bg-ink/5 p-2">
      <div className="flex items-center gap-2 rounded-md border-l-4 border-chain-lime bg-chain-cream px-3 py-1.5 text-chain-navy">
        <span
          aria-hidden="true"
          className={`size-2 shrink-0 rounded-full ${recording ? "bg-red-600" : "bg-chain-navy/25"}`}
        />
        <div className="min-w-0 truncate text-sm font-medium">{label}</div>
        <span aria-hidden="true" className="h-3 flex-1 border-b border-dashed border-chain-navy/25" />
        <span className="font-mono text-sm tabular-nums">{timer}</span>
      </div>
      <div aria-hidden="true" className="mt-2 flex items-center gap-2 rounded-full border border-chain-cream/10 bg-chain-navy px-1.5 py-1">
        <Reel tape={1 - wound} turning={turning} paused={reels === "held"} />
        {tape}
        <Reel tape={wound} turning={turning} paused={reels === "held"} />
      </div>
      <div className="mt-2 flex select-none items-center gap-1.5">{controls}</div>
    </div>
  );
}

export function AppDeckKey({
  label,
  primary = false,
  children
}: Readonly<{
  label: string;
  primary?: boolean;
  children: ReactNode;
}>) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`grid size-8 shrink-0 place-items-center rounded-md border focus-visible:outline-2 focus-visible:outline-ink ${primary ? "border-transparent bg-chain-navy text-chain-cream" : "border-ink/15 bg-white text-ink"}`}
    >
      {children}
    </button>
  );
}

function Reel({ tape, turning, paused }: Readonly<{ tape: number; turning: boolean; paused: boolean }>) {
  return (
    <svg viewBox="0 0 40 40" className="size-10 shrink-0">
      <circle cx="20" cy="20" r={10 + tape * 9} className="fill-chain-cream/25" />
      <g className={turning ? "origin-center app-cassette-reel" : "origin-center"} style={{ animationPlayState: paused ? "paused" : "running" }}>
        <circle cx="20" cy="20" r="8" className="fill-chain-navy stroke-chain-cream/70" strokeWidth="1.5" />
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <rect key={angle} x="19" y="12.5" width="2" height="3" rx="0.5" transform={`rotate(${angle} 20 20)`} className="fill-chain-cream/70" />
        ))}
        <circle cx="20" cy="20" r="2" className="fill-chain-cream/70" />
      </g>
    </svg>
  );
}
