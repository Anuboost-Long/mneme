import clsx from "clsx";
import { Link } from "react-router-dom";
import { Caption } from "../shared/ui/Typography";

export default function NavBar({ sidebarExpanded, onToggleSidebar }: Readonly<{
  sidebarExpanded: boolean;
  onToggleSidebar?: () => void;
}>) {
  return (
    <header className={clsx("flex h-16 shrink-0 items-center justify-between gap-4", "border-b border-ink/10 px-6")}>
      <div className={clsx("flex items-center gap-3")}>
        {onToggleSidebar && <button type="button" onClick={onToggleSidebar} aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"} title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"} aria-expanded={sidebarExpanded} aria-controls="workspace-sidebar" className={clsx("flex size-8 shrink-0 items-center justify-center rounded-md", "text-muted", "hover:bg-ink/5 hover:text-ink")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /><path d={sidebarExpanded ? "m16 9-3 3 3 3" : "m14 9 3 3-3 3"} /></svg>
        </button>}
        <Link to="/" className={clsx("flex items-center gap-3 font-semibold tracking-tight")} aria-label="Mneme home">
          <span className={clsx("flex size-7 items-center justify-center rounded-md", "bg-chain-navy dark:bg-chain-lime", "text-chain-lime dark:text-chain-navy")} aria-hidden="true">m</span>
          mneme
        </Link>
      </div>
      <Caption as="span" tone="muted">Learning workspace</Caption>
    </header>
  );
}
