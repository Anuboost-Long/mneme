import {
  contextTokens,
  estimateTokens,
  formatTokens,
  type AiContext
} from "@/features/ai-context/lib/types";
import clsx from "clsx";

export default function ContextSummary({
  context,
  className
}: Readonly<{ context: AiContext; className?: string }>) {
  if (!context.layers.length) return null;
  const labels = context.layers.map((layer) => layer.label).join(" · ");
  return (
    <details className={clsx("group min-w-0 text-xs", className)}>
      <summary
        className={clsx(
          "flex cursor-pointer list-none items-center gap-2 text-muted",
          "hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink",
          "[&::-webkit-details-marker]:hidden"
        )}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={clsx("size-3.5 shrink-0 group-open:rotate-90")}
        >
          <path d="m8 5 5 5-5 5" />
        </svg>
        <span className={clsx("min-w-0 flex-1 truncate")}>
          <span className={clsx("font-medium")}>Context</span> · {labels}
        </span>
        <span className={clsx("shrink-0 tabular-nums")}>
          {formatTokens(contextTokens(context))}
        </span>
      </summary>
      <ul
        tabIndex={0}
        aria-label="Context layers"
        className={clsx(
          "mt-2 max-h-48 overflow-y-auto pr-3 divide-y divide-ink/10 border-t border-ink/10",
          "focus-visible:outline-2 focus-visible:outline-ink"
        )}
      >
        {context.layers.map((layer) => (
          <li key={layer.label} className={clsx("flex items-baseline gap-3 py-1.5")}>
            <span className={clsx("w-20 shrink-0 font-medium text-ink")}>{layer.label}</span>
            <span className={clsx("min-w-0 flex-1 wrap-break-word text-muted")}>
              {layer.detail}
            </span>
            <span className={clsx("shrink-0 tabular-nums text-muted")}>
              ~{estimateTokens(layer.chars).toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
