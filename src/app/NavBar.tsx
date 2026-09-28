import clsx from "clsx";
import { Link } from "react-router-dom";
import { Caption } from "../shared/ui/Typography";
import appIcon from "../../asset/app-icon.svg";

export default function NavBar({ sidebarExpanded, onToggleSidebar }: Readonly<{
  sidebarExpanded: boolean;
  onToggleSidebar?: () => void;
}>) {
  return (
    <header className={clsx("relative flex h-18 shrink-0 items-center justify-between gap-4", "border-b border-ink/10 bg-surface px-5 sm:px-6")}>
      <div className={clsx("flex translate-y-0.5 items-center gap-3")}>
        {onToggleSidebar && <button type="button" onClick={onToggleSidebar} aria-label={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"} title={sidebarExpanded ? "Collapse sidebar" : "Expand sidebar"} aria-expanded={sidebarExpanded} aria-controls="workspace-sidebar" className={clsx("flex size-8 shrink-0 items-center justify-center rounded-md", "text-muted", "hover:bg-ink/5 hover:text-ink")}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /><path d={sidebarExpanded ? "m16 9-3 3 3 3" : "m14 9 3 3-3 3"} /></svg>
        </button>}
        <Link to="/" className={clsx("flex h-10 items-center gap-3 rounded-md", "text-xl font-semibold tracking-tight", "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-chain-lime")} aria-label="Mneme home">
          <img src={appIcon} alt="" className={clsx("block size-9 shrink-0 rounded-lg", "ring-1 ring-ink/15 dark:ring-chain-cream/25")} />
          <span>mneme</span>
        </Link>
      </div>
      <Caption as="span" tone="muted" className={clsx("hidden translate-y-0.5 sm:block")}>Learning workspace</Caption>
      <span aria-hidden="true" className={clsx("absolute inset-x-0 bottom-0 h-0.5 bg-chain-lime")} />
    </header>
  );
}
