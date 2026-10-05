import { useEffect, useRef } from "react";
import clsx from "clsx";
import { BodyText, Caption, SectionTitle } from "../../../shared/ui/Typography";
import type { useAgentChat } from "../lib/useAgentChat";
import { agentLabel } from "../lib/presets";
import { modelCommandHint, modelOptionsFor, supportsModelCommand } from "../lib/commands";
import Composer from "./Composer";
import ChatMessage, { ToolMessage } from "./ChatMessage";
import { AttachmentList } from "./AttachmentCard";
import FileDropOverlay from "./FileDropOverlay";
import ModeSwitch from "./ModeSwitch";
import { useAttachments, useFileDrop } from "../lib/useAttachments";
import { parseAttachments, type ChatAttachment } from "../lib/attachments";
import ProfilePicker from "../../ai-profiles/components/ProfilePicker";

const roles = { user: "You", assistant: "Agent", tool: "Tool activity", error: "Error" };

// One conversation: its transcript and composer. Used by the chat screen
// and the side panel. `context` goes to the agent with each message
// without being saved (see runTurn).
// `compact` (the side panel) leaves the title to the panel's own
// conversation picker.
export default function ConversationPane({ chat, selectedId, context, emptyText, compact = false, className }: Readonly<{
  chat: ReturnType<typeof useAgentChat>;
  selectedId: number | null;
  context?: string;
  emptyText: string;
  compact?: boolean;
  className?: string;
}>) {
  const transcriptRef = useRef<HTMLDivElement>(null);
  const followOutput = useRef(true);
  const conversation = chat.conversations.find((item) => item.id === selectedId);
  const connection = chat.connections.find((item) => item.id === conversation?.agent_connection_id);
  const files = useAttachments(conversation?.id ?? null);
  const canAttach = conversation !== undefined && connection !== undefined && !chat.turn?.busy && chat.messagesLoaded && !chat.messageError;
  const drop = useFileDrop(canAttach, (dropped) => void files.add(dropped));

  async function handleSend(message: string, attachments: ChatAttachment[]) {
    if (connection && await chat.runCommand(connection, message)) return;
    await chat.send(message, attachments, context);
  }

  useEffect(() => { followOutput.current = true; }, [selectedId]);
  useEffect(() => {
    const transcript = transcriptRef.current;
    if (transcript && followOutput.current) transcript.scrollTop = transcript.scrollHeight;
  }, [selectedId, chat.messages, chat.turn?.text, chat.turn?.tools]);

  return (
<section aria-label="Active conversation" {...drop.handlers} className={clsx("relative flex min-h-0 min-w-0 flex-col", className)}>
      {conversation ? <>
        <div className={clsx("flex shrink-0 flex-wrap justify-between gap-3", compact ? "items-end" : "items-start")}>
          <div className={clsx("min-w-0")}>
            {!compact && <SectionTitle className={clsx("break-words")}>{conversation.title ?? "New conversation"}</SectionTitle>}
            <Caption tone="muted" className={clsx(!compact && "mt-1")}>{connection?.name ?? "Unavailable connection"}{connection && connection.name !== agentLabel(connection.kind) && ` · ${agentLabel(connection.kind)}`}{supportsModelCommand(connection) && ` · ${connection?.model ?? "Default model"}`}</Caption>
          </div>
          <div className={clsx("w-full", compact ? "max-w-40" : "max-w-56")}><ProfilePicker compact /></div>
        </div>
        <div ref={transcriptRef} onScroll={(event) => { const element = event.currentTarget; followOutput.current = element.scrollHeight - element.scrollTop - element.clientHeight < 64; }} className={clsx("min-h-0 flex-1 overflow-y-auto py-6")}>
          {!chat.messagesLoaded && <BodyText role="status" tone="muted">Loading messages…</BodyText>}
          {chat.messageError && <div><BodyText role="alert" tone="error">{chat.messageError}</BodyText><button type="button" onClick={chat.retry} className={clsx("mt-2 text-sm underline")}>Try again</button></div>}
          {chat.messagesLoaded && !chat.messageError && !chat.messages.length && !chat.turn?.busy && <BodyText tone="muted">No messages yet. This conversation is saved on this device.</BodyText>}
          <ol className={clsx("space-y-6")}>
            {chat.messages.map((message) => <li key={message.id} className={clsx("py-4 first:pt-0")}>
              {message.role !== "tool" && <Caption tone={message.role === "error" ? "error" : "muted"}>{roles[message.role]}</Caption>}
              {message.role === "user" && <AttachmentList attachments={parseAttachments(message.attachments)} />}
              {message.role === "tool" ? <ToolMessage content={message.content} /> : <ChatMessage content={message.content} markdown={message.role === "assistant" && connection?.kind !== "custom"} />}
            </li>)}
          </ol>
        {chat.turn?.busy && <div className={clsx("pb-6")}>
          <Caption tone="muted">You</Caption>
          <AttachmentList attachments={chat.turn.attachments} />
          <ChatMessage content={chat.turn.message} />
          <div className={clsx("mt-5")}>
            <Caption tone="muted">{connection?.name ?? "Agent"}</Caption>
            {chat.turn.tools.map((tool) => <ToolMessage key={tool.id} content={JSON.stringify(tool)} running />)}
            <ChatMessage content={chat.turn.text} markdown={connection?.kind !== "custom"} />
            <BodyText role="status" tone="muted" className={clsx("mt-2")}>{chat.turn.stopping ? "Stopping…" : "Generating…"}</BodyText>
          </div>
        </div>}
        </div>
        {chat.turn?.error && !chat.messages.some((message) => message.role === "error" && message.content === chat.turn?.error) && <BodyText role="alert" tone="error" className={clsx("mb-3")}>{chat.turn.error}</BodyText>}
        {chat.notice && !chat.turn?.busy && <Caption tone="muted" className={clsx("mb-3")}>{chat.notice}</Caption>}
        {connection?.kind !== "custom" && (
          <div className={clsx("mb-3")}>
            <ModeSwitch mode={conversation.mode} disabled={chat.turn?.busy ?? false} onChange={(mode) => void chat.setMode(conversation.id, mode)} />
          </div>
        )}
        <Composer key={conversation.id} files={files} busy={chat.turn?.busy ?? false} stopping={chat.turn?.stopping ?? false}
          supported={connection !== undefined} ready={chat.messagesLoaded && !chat.messageError}
          custom={connection?.kind === "custom"} modelCommand={supportsModelCommand(connection)} modelHint={modelCommandHint(connection)}
          modelOptions={modelOptionsFor(connection)} onSend={handleSend} onStop={chat.stop} />
      </> : <BodyText tone="muted">{selectedId === null ? emptyText : "This conversation no longer exists. Select another conversation."}</BodyText>}
      <FileDropOverlay visible={drop.dragging} />
    </section>
  );
}
