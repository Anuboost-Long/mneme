import { parseAttachments, type ChatAttachment } from "@/features/agent-chat/lib/attachments";
import {
  modelCommandHint,
  modelOptionsFor,
  supportsModelCommand
} from "@/features/agent-chat/lib/commands";
import type { AgentConnection } from "@/features/agent-chat/lib/connection/types";
import { agentLabel } from "@/features/agent-chat/lib/presets";
import { hasTools } from "@/features/agent-chat/lib/runTurn";
import type { useAgentChat } from "@/features/agent-chat/lib/useAgentChat";
import { useAttachments, useFileDrop } from "@/features/agent-chat/lib/useAttachments";
import ContextSummary from "@/features/ai-context/components/ContextSummary";
import { buildChatContext } from "@/features/ai-context/lib/builder";
import { usePageSelection } from "@/features/ai-context/lib/selectionState";
import type { AiContext } from "@/features/ai-context/lib/types";
import ProfilePicker from "@/features/ai-profiles/components/ProfilePicker";
import { getActiveProfile } from "@/features/ai-profiles/lib/profile/actions";
import { BodyText, Caption, SectionTitle } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

import { AttachmentList } from "./AttachmentCard";
import ChatMessage, { ToolMessage } from "./ChatMessage";
import Composer from "./Composer";
import FileDropOverlay from "./FileDropOverlay";
import ModeSwitch from "./ModeSwitch";

const roles = { user: "You", assistant: "Agent", tool: "Tool activity", error: "Error" };
const contextPreviewDelay = 300;

async function pageContext(pageId: number, selection: string, connection: AgentConnection) {
  return buildChatContext(pageId, selection, hasTools(connection), await getActiveProfile());
}

// One conversation: its transcript and composer. Used by the chat screen
// and the side panel. On a page (`pageId`), each message goes with the
// context of that page, rebuilt at send time and not saved (see runTurn).
// `compact` (the side panel) leaves the title to the panel's own
// conversation picker.
export default function ConversationPane({
  chat,
  selectedId,
  pageId = null,
  emptyText,
  compact = false,
  className
}: Readonly<{
  chat: ReturnType<typeof useAgentChat>;
  selectedId: number | null;
  pageId?: number | null;
  emptyText: string;
  compact?: boolean;
  className?: string;
}>) {
  const transcriptRef = useRef<HTMLDivElement>(null);
  const followOutput = useRef(true);
  const conversation = chat.conversations.find((item) => item.id === selectedId);
  const connection = chat.connections.find((item) => item.id === conversation?.agent_connection_id);
  const files = useAttachments(conversation?.id ?? null);
  const canAttach =
    conversation !== undefined &&
    connection !== undefined &&
    !chat.turn?.busy &&
    chat.messagesLoaded &&
    !chat.messageError;
  const drop = useFileDrop(canAttach, (dropped) => void files.add(dropped));
  const selection = usePageSelection(pageId);
  const [context, setContext] = useState<AiContext | null>(null);
  const messageCount = chat.messages.length;

  useEffect(() => {
    setContext(null);
    if (pageId === null || !connection) return;
    let active = true;
    const timer = setTimeout(() => {
      pageContext(pageId, selection, connection)
        .then((built) => active && setContext(built))
        .catch(() => undefined);
    }, contextPreviewDelay);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [pageId, selection, connection, messageCount]);

  async function handleSend(message: string, attachments: ChatAttachment[]) {
    if (connection && (await chat.runCommand(connection, message))) return;
    const sent =
      pageId !== null && connection
        ? await pageContext(pageId, selection, connection).catch(() => null)
        : null;
    await chat.send(message, attachments, sent?.text || undefined);
  }

  useEffect(() => {
    followOutput.current = true;
  }, [selectedId]);
  useEffect(() => {
    const transcript = transcriptRef.current;
    if (transcript && followOutput.current) transcript.scrollTop = transcript.scrollHeight;
  }, [selectedId, chat.messages, chat.turn?.text, chat.turn?.tools]);

  return (
    <section
      aria-label="Active conversation"
      {...drop.handlers}
      className={clsx("relative flex min-h-0 min-w-0 flex-col", className)}
    >
      {conversation ? (
        <>
          <div
            className={clsx(
              "flex shrink-0 flex-wrap justify-between gap-3",
              compact ? "items-end" : "items-start"
            )}
          >
            <div className={clsx("min-w-0")}>
              {!compact && (
                <SectionTitle className={clsx("break-words")}>
                  {conversation.title ?? "New conversation"}
                </SectionTitle>
              )}
              <Caption tone="muted" className={clsx(!compact && "mt-1")}>
                {connection?.name ?? "Unavailable connection"}
                {connection &&
                  connection.name !== agentLabel(connection.kind) &&
                  ` · ${agentLabel(connection.kind)}`}
                {supportsModelCommand(connection) && ` · ${connection?.model ?? "Default model"}`}
              </Caption>
            </div>
            <div className={clsx("w-full", compact ? "max-w-40" : "max-w-56")}>
              <ProfilePicker compact />
            </div>
          </div>
          <div
            ref={transcriptRef}
            onScroll={(event) => {
              const element = event.currentTarget;
              followOutput.current =
                element.scrollHeight - element.scrollTop - element.clientHeight < 64;
            }}
            className={clsx("min-h-0 flex-1 overflow-y-auto py-6")}
          >
            {!chat.messagesLoaded && (
              <BodyText role="status" tone="muted">
                Loading messages…
              </BodyText>
            )}
            {chat.messageError && (
              <div>
                <BodyText role="alert" tone="error">
                  {chat.messageError}
                </BodyText>
                <button
                  type="button"
                  onClick={chat.retry}
                  className={clsx("mt-2 text-sm underline")}
                >
                  Try again
                </button>
              </div>
            )}
            {chat.messagesLoaded &&
              !chat.messageError &&
              !chat.messages.length &&
              !chat.turn?.busy && (
                <BodyText tone="muted">
                  No messages yet. This conversation is saved on this device.
                </BodyText>
              )}
            <ol className={clsx("space-y-6")}>
              {chat.messages.map((message) => (
                <li key={message.id} className={clsx("py-4 first:pt-0")}>
                  {message.role !== "tool" && (
                    <Caption tone={message.role === "error" ? "error" : "muted"}>
                      {roles[message.role]}
                    </Caption>
                  )}
                  {message.role === "user" && (
                    <AttachmentList attachments={parseAttachments(message.attachments)} />
                  )}
                  {message.role === "tool" ? (
                    <ToolMessage content={message.content} />
                  ) : (
                    <ChatMessage
                      content={message.content}
                      markdown={message.role === "assistant" && connection?.kind !== "custom"}
                    />
                  )}
                </li>
              ))}
            </ol>
            {chat.turn?.busy && (
              <div className={clsx("pb-6")}>
                <Caption tone="muted">You</Caption>
                <AttachmentList attachments={chat.turn.attachments} />
                <ChatMessage content={chat.turn.message} />
                <div className={clsx("mt-5")}>
                  <Caption tone="muted">{connection?.name ?? "Agent"}</Caption>
                  {chat.turn.tools.map((tool) => (
                    <ToolMessage key={tool.id} content={JSON.stringify(tool)} running />
                  ))}
                  <ChatMessage content={chat.turn.text} markdown={connection?.kind !== "custom"} />
                  <BodyText role="status" tone="muted" className={clsx("mt-2")}>
                    {chat.turn.stopping ? "Stopping…" : "Generating…"}
                  </BodyText>
                </div>
              </div>
            )}
          </div>
          {chat.turn?.error &&
            !chat.messages.some(
              (message) => message.role === "error" && message.content === chat.turn?.error
            ) && (
              <BodyText role="alert" tone="error" className={clsx("mb-3")}>
                {chat.turn.error}
              </BodyText>
            )}
          {chat.notice && !chat.turn?.busy && (
            <Caption tone="muted" className={clsx("mb-3")}>
              {chat.notice}
            </Caption>
          )}
          {context && <ContextSummary context={context} className={clsx("mb-3")} />}
          {connection?.kind !== "custom" && (
            <div className={clsx("mb-3")}>
              <ModeSwitch
                mode={conversation.mode}
                disabled={chat.turn?.busy ?? false}
                onChange={(mode) => void chat.setMode(conversation.id, mode)}
              />
            </div>
          )}
          <Composer
            key={conversation.id}
            files={files}
            busy={chat.turn?.busy ?? false}
            stopping={chat.turn?.stopping ?? false}
            supported={connection !== undefined}
            ready={chat.messagesLoaded && !chat.messageError}
            custom={connection?.kind === "custom"}
            modelCommand={supportsModelCommand(connection)}
            modelHint={modelCommandHint(connection)}
            modelOptions={modelOptionsFor(connection)}
            onSend={handleSend}
            onStop={chat.stop}
          />
        </>
      ) : (
        <BodyText tone="muted">
          {selectedId === null
            ? emptyText
            : "This conversation no longer exists. Select another conversation."}
        </BodyText>
      )}
      <FileDropOverlay visible={drop.dragging} />
    </section>
  );
}
