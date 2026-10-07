import clsx from "clsx";

export default function TaskCheck({
  title,
  done,
  disabled,
  onChange
}: Readonly<{ title: string; done: boolean; disabled?: boolean; onChange: (done: boolean) => void }>) {
  return (
    <span className={clsx("relative flex size-4 shrink-0")}>
      <input
        type="checkbox"
        checked={done}
        disabled={disabled}
        aria-label={done ? `Reopen “${title}”` : `Mark “${title}” done`}
        onChange={(event) => onChange(event.target.checked)}
        className={clsx(
          "peer size-4 cursor-pointer appearance-none rounded-sm",
          "border border-ink/40 checked:border-accent checked:bg-accent",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
        )}
      />
      <svg
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={clsx("pointer-events-none absolute inset-0 hidden size-4 text-on-accent peer-checked:block")}
      >
        <path d="m4 8.5 2.5 2.5L12 5.5" />
      </svg>
    </span>
  );
}
