import clsx from "clsx";
import { Caption } from "../../../shared/ui/Typography";

export default function ProgressSummary({ done, total, noun, className }: Readonly<{
  done: number;
  total: number;
  noun: string;
  className?: string;
}>) {
  return (
    <div className={clsx("flex max-w-md items-center gap-3", className)}>
      <progress value={done} max={total} aria-label={`${noun} done`} className={clsx(
        "block h-1 flex-1 appearance-none overflow-hidden rounded-full bg-ink/10",
        "[&::-webkit-progress-bar]:bg-ink/10 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-accent [&::-moz-progress-bar]:bg-accent",
      )} />
      <Caption as="span" tone="muted" className={clsx("shrink-0 tabular-nums")}>{done} of {total} {noun} done</Caption>
    </div>
  );
}
