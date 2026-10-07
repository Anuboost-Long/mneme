import { NodeViewContent, NodeViewWrapper, type ReactNodeViewProps } from "@tiptap/react";
import clsx from "clsx";

import { calloutTones, type CalloutTone } from "./Callout";

const toneLabels: Record<CalloutTone, string> = { note: "Note", tip: "Tip", warning: "Warning" };

const toneIcons: Record<CalloutTone, string> = {
  note: "M12 16v-4m0-4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  tip: "M9 18h6m-5 3h4M12 3a6 6 0 0 0-3.6 10.8c.4.3.6.8.6 1.2v1h6v-1c0-.4.2-.9.6-1.2A6 6 0 0 0 12 3Z",
  warning: "M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
};

// The icon cycles the tone, so a callout changes kind without a menu.
export default function CalloutNodeView({ node, updateAttributes, editor }: Readonly<ReactNodeViewProps>) {
  const tone = node.attrs.tone as CalloutTone;
  const next = calloutTones[(calloutTones.indexOf(tone) + 1) % calloutTones.length];

  return (
    <NodeViewWrapper as="aside" data-callout={tone} className={clsx("callout flex gap-3 rounded-lg px-4 py-3")}>
      <button
        type="button"
        contentEditable={false}
        disabled={!editor.isEditable}
        onClick={() => updateAttributes({ tone: next })}
        aria-label={`${toneLabels[tone]} callout. Change to ${toneLabels[next]}`}
        title={`Change to ${toneLabels[next]}`}
        className={clsx("callout-icon mt-1 grid size-6 shrink-0 place-items-center rounded-md", "hover:bg-ink/5 focus-visible:outline-1 focus-visible:outline-ink")}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d={toneIcons[tone]} />
        </svg>
      </button>
      <NodeViewContent className={clsx("min-w-0 flex-1")} />
    </NodeViewWrapper>
  );
}
