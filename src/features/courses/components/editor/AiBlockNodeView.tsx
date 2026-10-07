import AgentSelect from "@/features/agent-chat/components/AgentSelect";
import { getAgentConnection } from "@/features/agent-chat/lib/connection/actions";
import { acceptsImages } from "@/features/agent-chat/lib/runTurn";
import { useAgentChoice } from "@/features/agent-chat/lib/useAgentChoice";
import { compactHtml } from "@/features/ai-actions/lib/context";
import { markdownToEditorHtml } from "@/features/ai-actions/lib/editorHtml";
import { runAction } from "@/features/ai-actions/lib/runAction";
import { buildActionContext } from "@/features/ai-context/lib/builder";
import { getActiveProfile } from "@/features/ai-profiles/lib/profile/actions";
import { errorMessage } from "@/shared/lib/errorMessage";
import { extractImages } from "@/shared/lib/htmlImages";
import { Caption } from "@/shared/ui/Typography";
import {
  getHTMLFromFragment,
  NodeViewContent,
  NodeViewWrapper,
  type ReactNodeViewProps
} from "@tiptap/react";
import clsx from "clsx";
import { useEffect, useRef, useState, type SubmitEvent } from "react";

import type { AiBlockLocation } from "./AiBlock";

export default function AiBlockNodeView({
  node,
  editor,
  extension,
  getPos,
  updateAttributes
}: Readonly<ReactNodeViewProps>) {
  const [prompt, setPrompt] = useState(node.attrs.prompt as string);
  const [running, setRunning] = useState(false);
  const [streamed, setStreamed] = useState("");
  const [error, setError] = useState<string | null>(null);
  const agent = useAgentChoice();
  const kill = useRef<(() => Promise<void>) | null>(null);
  const hasOutput = node.content.size > 0;

  useEffect(() => () => void kill.current?.(), []);

  // The page as the agent sees it: everything but this block.
  function pageWithoutBlock(position: number) {
    const { doc } = editor.state.tr.delete(position, position + node.nodeSize);
    return compactHtml(getHTMLFromFragment(doc.content, editor.schema));
  }

  function replaceOutput(text: string) {
    const position = getPos();
    const current = position === undefined ? null : editor.state.doc.nodeAt(position);
    if (position === undefined || current?.type.name !== "aiBlock") return;
    editor
      .chain()
      .insertContentAt(
        { from: position + 1, to: position + current.nodeSize - 1 },
        markdownToEditorHtml(text)
      )
      .run();
  }

  async function generate(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const position = getPos();
    if (!prompt.trim() || position === undefined) return;
    updateAttributes({ prompt: prompt.trim() });
    setError(null);
    setStreamed("");
    setRunning(true);
    try {
      const connection = await getAgentConnection(agent.connectionId);
      if (!connection)
        throw new Error("No agent connected yet. Add one in Agent chat to use AI blocks.");
      const location = extension.options as AiBlockLocation;
      const profile = await getActiveProfile(location.courseId);
      const content = await extractImages(pageWithoutBlock(position));
      const context = await buildActionContext(
        location,
        "page",
        content.images,
        acceptsImages(connection),
        profile
      );
      const handle = await runAction(
        connection,
        { prompt: prompt.trim() },
        "page",
        content,
        context.text,
        profile,
        (turn) => {
          switch (turn.type) {
            case "text":
              setStreamed((text) => text + turn.text);
              break;
            case "done":
              replaceOutput(turn.text);
              setRunning(false);
              break;
            case "error":
              setError(turn.message);
              setRunning(false);
              break;
          }
        }
      );
      kill.current = handle.kill;
    } catch (runError) {
      setError(
        errorMessage(runError, "Couldn’t start the agent. Check it’s installed and try again.")
      );
      setRunning(false);
    }
  }

  function stop() {
    void kill.current?.();
    kill.current = null;
    setRunning(false);
  }

  return (
    <NodeViewWrapper className={clsx("rounded-lg", "border border-ink/15")}>
      <form
        contentEditable={false}
        onSubmit={(event) => void generate(event)}
        className={clsx("flex items-center gap-2 p-2")}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={clsx("ml-1 shrink-0 text-muted")}
        >
          <path d="M11 3.5 12.9 9 18.5 11 12.9 13 11 18.5 9.1 13 3.5 11 9.1 9Z" />
          <path d="M18.5 15.5 19.3 17.7 21.5 18.5 19.3 19.3 18.5 21.5 17.7 19.3 15.5 18.5 17.7 17.7Z" />
        </svg>
        <input
          value={prompt}
          disabled={!editor.isEditable || running}
          onChange={(event) => setPrompt(event.target.value)}
          onBlur={() =>
            prompt.trim() !== node.attrs.prompt && updateAttributes({ prompt: prompt.trim() })
          }
          placeholder="What should AI write here? For example: the key terms on this page"
          aria-label="AI block prompt"
          className={clsx(
            "h-8 min-w-0 flex-1 rounded-md",
            "bg-transparent",
            "px-1 text-sm",
            "focus-visible:outline-none"
          )}
        />
        <AgentSelect
          choice={agent}
          compact
          disabled={!editor.isEditable || running}
          className={clsx("w-36 shrink-0")}
        />
        {running ? (
          <button
            type="button"
            onClick={stop}
            className={clsx(
              "h-8 shrink-0 rounded-md",
              "border border-ink/20 bg-surface",
              "px-3 text-sm",
              "hover:bg-ink/5 focus-visible:outline-1 focus-visible:outline-ink"
            )}
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!editor.isEditable || !prompt.trim()}
            className={clsx(
              "h-8 shrink-0 rounded-md",
              "bg-action text-on-action",
              "px-3 text-sm font-medium",
              "disabled:opacity-50 focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink"
            )}
          >
            {hasOutput ? "Regenerate" : "Generate"}
          </button>
        )}
      </form>
      {running && (
        <p
          contentEditable={false}
          aria-live="polite"
          className={clsx(
            "border-t border-ink/10",
            "px-4 py-3 text-sm whitespace-pre-wrap text-muted"
          )}
        >
          {streamed || "Writing…"}
        </p>
      )}
      {error && (
        <Caption
          contentEditable={false}
          tone="error"
          className={clsx("border-t border-ink/10 px-4 py-2")}
        >
          {error}
        </Caption>
      )}
      <NodeViewContent
        className={clsx(
          "ai-block-output border-t border-ink/10 px-4 py-3",
          (running || !hasOutput) && "hidden"
        )}
      />
    </NodeViewWrapper>
  );
}
