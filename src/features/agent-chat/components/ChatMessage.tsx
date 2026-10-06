import { renderMarkdown } from "@/features/agent-chat/lib/markdown";
import type { ToolActivity } from "@/features/agent-chat/lib/runTurn";
import { BodyText } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

function formatToolText(text: string): string {
  try {
    const value = JSON.parse(text);
    if (
      Array.isArray(value) &&
      value.length > 0 &&
      value.every((block) => block?.type === "text" && typeof block.text === "string")
    ) {
      return value.map((block) => formatToolText(block.text)).join("\n\n");
    }
    return JSON.stringify(value, null, 2);
  } catch {
    return text;
  }
}

export function ToolMessage({
  content,
  running = false
}: Readonly<{ content: string; running?: boolean }>) {
  let tool: ToolActivity | undefined;
  try {
    const value = JSON.parse(content);
    if (
      value &&
      typeof value.name === "string" &&
      typeof value.input === "string" &&
      (value.result === undefined || typeof value.result === "string")
    )
      tool = value;
  } catch {
    /* Older transcripts may contain plain tool text. */
  }
  const pending = tool?.result === undefined && running;
  const status = tool?.isError
    ? "Failed"
    : tool?.result !== undefined
      ? "Finished"
      : pending
        ? "Running"
        : "No result";
  const title = tool?.name.replace(/^mcp__mneme__/, "").replace(/_/g, " ");
  return (
    <details className={clsx("group my-2 min-w-0 rounded-lg border border-ink/10 text-sm")}>
      <summary
        className={clsx(
          "flex cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-3",
          "hover:bg-ink/4 focus-visible:outline-2 focus-visible:outline-offset-2",
          "[&::-webkit-details-marker]:hidden"
        )}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={clsx(
            "size-4 shrink-0",
            tool?.isError ? "text-danger" : "text-muted",
            pending && "motion-safe:animate-spin"
          )}
        >
          {pending ? (
            <path d="M10 3a7 7 0 1 1-7 7" />
          ) : tool?.isError ? (
            <path d="m6 6 8 8M14 6l-8 8" />
          ) : tool?.result !== undefined ? (
            <path d="m4 10 4 4 8-8" />
          ) : (
            <circle cx="10" cy="10" r="6" />
          )}
        </svg>
        <span className={clsx("min-w-0 flex-1 break-words font-medium")}>
          {title ? title.charAt(0).toUpperCase() + title.slice(1) : "Function activity"}
        </span>
        <span className={clsx("shrink-0 text-xs", tool?.isError ? "text-danger" : "text-muted")}>
          {status}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={clsx("size-4 shrink-0 text-muted group-open:rotate-90")}
        >
          <path d="m8 5 5 5-5 5" />
        </svg>
      </summary>
      <div className={clsx("space-y-4 border-t border-ink/10 px-3 py-3")}>
        {tool ? (
          <>
            <p className={clsx("break-all font-mono text-xs text-muted")}>{tool.name}</p>
            <div>
              <p className={clsx("mb-2 text-xs font-medium text-muted")}>Input</p>
              <ToolOutput content={tool.input || "Waiting for input…"} />
            </div>
            <div>
              <p className={clsx("mb-2 text-xs font-medium text-muted")}>Output</p>
              {tool.result === undefined ? (
                <p className={clsx("text-xs text-muted")}>
                  {pending ? "Waiting for a result…" : "This function did not return a result."}
                </p>
              ) : (
                <ToolOutput content={tool.result || "No output returned."} />
              )}
            </div>
          </>
        ) : (
          <ToolOutput content={content} />
        )}
      </div>
    </details>
  );
}

function ToolOutput({ content }: Readonly<{ content: string }>) {
  return (
    <pre
      tabIndex={0}
      className={clsx(
        "max-h-72 overflow-auto rounded-md bg-ink/4 p-3",
        "whitespace-pre-wrap break-words font-mono text-xs leading-6",
        "focus-visible:outline-2 focus-visible:outline-offset-2"
      )}
    >
      {formatToolText(content)}
    </pre>
  );
}

export default function ChatMessage({
  content,
  markdown = false
}: Readonly<{ content: string; markdown?: boolean }>) {
  const root = useRef<HTMLDivElement>(null);
  const [copyStatus, setCopyStatus] = useState("");
  useEffect(() => {
    const element = root.current;
    if (!element || !markdown) return;
    let disposed = false;
    async function copy(event: MouseEvent) {
      if (!(event.target instanceof Element)) return;
      const button = event.target.closest("button[data-copy-code]");
      const code = button?.closest("figure")?.querySelector("pre code");
      if (!code) return;
      try {
        await navigator.clipboard.writeText(code.textContent ?? "");
        if (!disposed) setCopyStatus("Code copied.");
      } catch {
        if (!disposed) setCopyStatus("Couldn’t copy. Select the code and copy it manually.");
      }
    }
    element.addEventListener("click", copy);
    return () => {
      disposed = true;
      element.removeEventListener("click", copy);
    };
  }, [markdown]);
  useEffect(() => {
    if (!copyStatus) return;
    const timeout = setTimeout(() => setCopyStatus(""), 3000);
    return () => clearTimeout(timeout);
  }, [copyStatus]);
  if (!markdown)
    return <BodyText className={clsx("mt-2 whitespace-pre-wrap break-words")}>{content}</BodyText>;
  return (
    <>
      <div
        ref={root}
        className={clsx(
          "mt-2 min-w-0 space-y-4 break-words text-sm leading-7",
          "[&_code]:font-mono [&_p_code]:rounded [&_p_code]:bg-ink/6 [&_p_code]:px-1 [&_li_code]:bg-ink/6 [&_a]:underline [&_a]:underline-offset-3",
          "[&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-6 [&_blockquote]:border-l-2 [&_blockquote]:border-ink/20 [&_blockquote]:pl-4 [&_blockquote]:text-muted",
          "[&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_hr]:border-ink/10"
        )}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
      />
      <p role="status" className={clsx("text-xs text-muted", copyStatus && "mt-2")}>
        {copyStatus}
      </p>
    </>
  );
}
