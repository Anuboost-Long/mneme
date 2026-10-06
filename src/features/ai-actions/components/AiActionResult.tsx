import { markdownToEditorHtml } from "@/features/ai-actions/lib/editorHtml";
import type { RunScope } from "@/features/ai-actions/lib/runAction";
import type { ActionRun, Placement } from "@/features/ai-actions/lib/useAiAction";
import ContextSummary from "@/features/ai-context/components/ContextSummary";
import { BodyText, Caption } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useState } from "react";

const scopeLabels: Record<RunScope, string> = {
  selection: "Selected text",
  image: "Image",
  page: "Whole page",
  module: "Whole module",
  course: "Whole course"
};

const insertLabels: Record<Placement, string> = {
  selection: "Insert below",
  cursor: "Insert at cursor",
  end: "Add to page"
};

const secondaryButton = clsx(
  "rounded-md px-3 py-1.5 text-sm text-muted",
  "hover:bg-ink/5 hover:text-ink"
);

export default function AiActionResult({
  run,
  onStop,
  onInsert,
  onAddSection,
  onReplace,
  onSaveAsPage,
  onDiscard
}: Readonly<{
  run: ActionRun;
  onStop: () => void;
  onInsert: () => void;
  onAddSection: () => void;
  onReplace: () => void;
  onSaveAsPage: () => void;
  onDiscard: () => void;
}>) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(run.text).then(
      () => setCopied(true),
      () => {}
    );
  }

  function renderFooter() {
    switch (run.status) {
      case "running":
        return (
          <button type="button" onClick={onStop} className={secondaryButton}>
            Stop
          </button>
        );
      case "error":
        return (
          <>
            {run.text && (
              <button type="button" onClick={copy} className={secondaryButton}>
                {copied ? "Copied" : "Copy"}
              </button>
            )}
            <button type="button" onClick={onDiscard} className={secondaryButton}>
              Close
            </button>
          </>
        );
      case "done":
        return (
          <>
            <button type="button" onClick={onDiscard} className={secondaryButton}>
              Discard
            </button>
            <button type="button" onClick={copy} className={secondaryButton}>
              {copied ? "Copied" : "Copy"}
            </button>
            <button type="button" onClick={onSaveAsPage} className={secondaryButton}>
              Save as page
            </button>
            <button type="button" onClick={onAddSection} className={secondaryButton}>
              Add as section
            </button>
            {run.scope === "selection" && (
              <button
                type="button"
                onClick={onReplace}
                className={clsx(
                  "rounded-md border border-ink/15 px-3 py-1.5 text-sm font-medium",
                  "hover:bg-ink/5"
                )}
              >
                Replace selection
              </button>
            )}
            <button
              type="button"
              onClick={onInsert}
              className={clsx(
                "rounded-md bg-action px-3 py-1.5 text-sm font-medium text-on-action",
                "hover:bg-action/85"
              )}
            >
              {insertLabels[run.placement]}
            </button>
          </>
        );
    }
  }

  return (
    <section
      aria-label={`${run.action.name} result`}
      className={clsx(
        "fixed right-4 bottom-20 left-4 z-40 flex max-h-3/5 flex-col sm:left-auto sm:w-md",
        "rounded-lg border border-ink/20 bg-surface shadow-lg"
      )}
    >
      <header
        className={clsx(
          "flex items-baseline justify-between gap-3 border-b border-ink/10 px-4 py-3"
        )}
      >
        <BodyText as="h2" className={clsx("font-semibold")}>
          {run.action.name}
        </BodyText>
        <Caption as="span" tone="muted">
          {scopeLabels[run.scope]}
        </Caption>
      </header>
      {run.context && (
        <ContextSummary
          context={run.context}
          className={clsx("border-b border-ink/10 px-4 py-2")}
        />
      )}
      <div className={clsx("min-h-0 flex-1 overflow-y-auto px-4 py-3")}>
        {run.text && (
          <div
            className={clsx("page-editor-content wrap-anywhere")}
            dangerouslySetInnerHTML={{ __html: markdownToEditorHtml(run.text) }}
          />
        )}
        {!run.text && run.status === "running" && (
          <BodyText role="status" tone="muted">
            Working…
          </BodyText>
        )}
        {run.status === "error" && (
          <BodyText role="alert" tone="error" className={clsx(run.text && "mt-3")}>
            {run.error}
          </BodyText>
        )}
      </div>
      <footer className={clsx("flex flex-wrap justify-end gap-2 border-t border-ink/10 px-4 py-3")}>
        {renderFooter()}
      </footer>
    </section>
  );
}
