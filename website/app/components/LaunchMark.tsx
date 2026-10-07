"use client";

import { useInView } from "motion/react";
import { useRef } from "react";

export default function LaunchMark() {
  const mark = useRef<SVGSVGElement>(null);
  const shown = useInView(mark, { once: true, amount: 0.6 });

  return (
    <svg
      ref={mark}
      viewBox="0 0 256 256"
      fill="none"
      aria-hidden="true"
      data-shown={shown || undefined}
      className="launch-mark size-24 overflow-visible sm:size-28"
    >
      <rect x="8" y="8" width="240" height="240" rx="52" fill="#171B24" />
      <path
        className="thread"
        pathLength="1"
        d="M52 182V91C52 74.984 64.984 62 81 62s29 12.984 29 29v54c0 16.016 12.984 29 29 29s29-12.984 29-29V91c0-16.016 12.984-29 29-29s29 12.984 29 29v91"
        transform="translate(-8 5)"
        stroke="#EEF2E4"
        strokeWidth="20"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle className="roll-in" cx="44" cy="187" r="12" fill="#C5F74F" />
      <circle className="drop-in" cx="196" cy="187" r="12" fill="#C5F74F" />
    </svg>
  );
}
