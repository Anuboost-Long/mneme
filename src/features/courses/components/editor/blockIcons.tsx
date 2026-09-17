import type { ReactNode } from "react";
import clsx from "clsx";

const iconClass = "flex size-4 shrink-0 items-center justify-center text-[13px] font-semibold";

export const blockIcons: Record<string, ReactNode> = {
  paragraph: <span className={clsx(iconClass, "font-serif font-normal")}>T</span>,
  heading1: <span className={iconClass}>H1</span>,
  heading2: <span className={iconClass}>H2</span>,
  heading3: <span className={iconClass}>H3</span>,
  codeBlock: <span className={clsx(iconClass, "font-mono text-[11px]")}>{"</>"}</span>,
  bulletList: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="4" cy="6" r="1.2" fill="currentColor" stroke="none" /><path d="M9 6h11" />
      <circle cx="4" cy="12" r="1.2" fill="currentColor" stroke="none" /><path d="M9 12h11" />
      <circle cx="4" cy="18" r="1.2" fill="currentColor" stroke="none" /><path d="M9 18h11" />
    </svg>
  ),
  orderedList: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <text x="1.5" y="8.5" fontSize="7" fill="currentColor" stroke="none">1</text><path d="M9 6h11" />
      <text x="1.5" y="14.5" fontSize="7" fill="currentColor" stroke="none">2</text><path d="M9 12h11" />
      <text x="1.5" y="20.5" fontSize="7" fill="currentColor" stroke="none">3</text><path d="M9 18h11" />
    </svg>
  ),
  taskList: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="6" height="6" rx="1.5" /><path d="m4.5 7 1 1 2-2" /><path d="M12 7h9" />
      <rect x="3" y="14" width="6" height="6" rx="1.5" /><path d="M12 17h9" />
    </svg>
  ),
  blockquote: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 8c-2 0-3 1.5-3 3.5S5 15 7 15M17 8c-2 0-3 1.5-3 3.5S15 15 17 15" />
    </svg>
  ),
  table: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M3 10h18M9 4v16M15 4v16" />
    </svg>
  ),
  horizontalRule: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M4 12h16" />
    </svg>
  ),
  image: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="1.5" /><circle cx="9" cy="10" r="1.5" /><path d="m4 18 5-5 4 4 3-3 4 4" />
    </svg>
  ),
};
