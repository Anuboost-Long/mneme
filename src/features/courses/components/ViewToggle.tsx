import clsx from "clsx";
import type { ReactNode } from "react";

export type PageView = "list" | "gallery";

const views: { value: PageView; label: string; icon: ReactNode }[] = [
  {
    value: "list",
    label: "List",
    icon: <path d="M9 7h10M9 12h10M9 17h10M5 7h.01M5 12h.01M5 17h.01" />
  },
  {
    value: "gallery",
    label: "Gallery",
    icon: (
      <>
        <rect x="4" y="4" width="7" height="7" rx="1.5" />
        <rect x="13" y="4" width="7" height="7" rx="1.5" />
        <rect x="4" y="13" width="7" height="7" rx="1.5" />
        <rect x="13" y="13" width="7" height="7" rx="1.5" />
      </>
    )
  }
];

// Switches the page list between rows and cards.
export default function ViewToggle({ value, onChange }: Readonly<{ value: PageView; onChange: (view: PageView) => void }>) {
  return (
    <fieldset className={clsx("flex h-9 shrink-0 items-stretch gap-0.5 rounded-md border border-ink/20 bg-surface p-0.5")}>
      <legend className={clsx("sr-only")}>Show pages as</legend>
      {views.map((view) => (
        <button
          key={view.value}
          type="button"
          aria-pressed={value === view.value}
          aria-label={view.label}
          title={view.label}
          onClick={() => onChange(view.value)}
          className={clsx(
            "flex shrink-0 items-center justify-center rounded-sm px-2",
            value === view.value ? "bg-ink/7 text-ink" : "text-muted hover:bg-ink/5 hover:text-ink",
            "focus-visible:outline-2 focus-visible:outline-ink"
          )}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {view.icon}
          </svg>
        </button>
      ))}
    </fieldset>
  );
}
