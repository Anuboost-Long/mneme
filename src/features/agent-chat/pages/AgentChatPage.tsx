import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { useListView, type SortOption } from "../../../shared/lib/useListView";
import { useStoredChoice } from "../../../shared/lib/useStoredChoice";
import { DATE_GROUP_VALUES, groupByDate } from "../../../shared/lib/dateGroups";
import ListToolbar from "../../../shared/ui/ListToolbar";
import { BodyText, Caption, PageTitle, SectionTitle } from "../../../shared/ui/Typography";
import type { Conversation } from "../lib/conversations";
import type { useAgentChat } from "../lib/useAgentChat";
import { agentLabel } from "../lib/presets";
import { modelCommandHint, modelOptionsFor, supportsModelCommand } from "../lib/commands";
import AgentPicker from "../components/AgentPicker";
import Composer from "../components/Composer";
import ChatMessage, { ToolMessage } from "../components/ChatMessage";
import { AttachmentList } from "../components/AttachmentCard";
import FileDropOverlay from "../components/FileDropOverlay";
import { useAttachments, useFileDrop } from "../lib/useAttachments";
import { parseAttachments, type ChatAttachment } from "../lib/attachments";
import ConversationActions from "../components/ConversationActions";
import ProfilePicker from "../../ai-profiles/components/ProfilePicker";

const sorts: SortOption<Conversation, "updated" | "title">[] = [
  { value: "updated", label: "Last active", compare: (a, b) => b.updated_at.localeCompare(a.updated_at) || b.id - a.id },
  { value: "title", label: "Title", compare: (a, b) => (a.title ?? "New conversation").localeCompare(b.title ?? "New conversation") || b.id - a.id },
];
const matches = (conversation: Conversation, query: string) => (conversation.title ?? "New conversation").toLowerCase().includes(query);
const roles = { user: "You", assistant: "Agent", tool: "Tool activity", error: "Error" };

export default function AgentChatPage({ chat, selectedId, onSelect }: Readonly<{
  chat: ReturnType<typeof useAgentChat>;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}>) {
  const transcriptRef = useRef<HTMLDivElement>(null);
  const followOutput = useRef(true);
  const conversationsRef = useRef<HTMLElement>(null);
  const [action, setAction] = useState<"create" | null>(null);
  const list = useListView(chat.conversations, matches, sorts, "mneme.agent-chat.sort");
  const [groupBy, setGroupBy] = useStoredChoice("mneme.agent-chat.group", DATE_GROUP_VALUES, "none");
  const conversation = chat.conversations.find((item) => item.id === selectedId);
  const connection = chat.connections.find((item) => item.id === conversation?.agent_connection_id);
  const groups = groupByDate(list.visible, (item) => `${item.updated_at.replace(" ", "T")}Z`, groupBy);
  const files = useAttachments(conversation?.id ?? null);
  const canAttach = conversation !== undefined && connection !== undefined && !chat.turn?.busy && chat.messagesLoaded && !chat.messageError;
  const drop = useFileDrop(canAttach, (dropped) => void files.add(dropped));

  async function handleSend(message: string, attachments: ChatAttachment[]) {
    if (connection && await chat.runCommand(connection, message)) return;
    await chat.send(message, attachments);
  }

  useEffect(() => { followOutput.current = true; }, [selectedId]);
  useEffect(() => {
    const transcript = transcriptRef.current;
    if (transcript && followOutput.current) transcript.scrollTop = transcript.scrollHeight;
  }, [selectedId, chat.messages, chat.turn?.text, chat.turn?.tools]);

  return (
    <div className={clsx("@container flex h-full min-h-120 shrink-0 flex-col px-4 py-5 sm:px-6")}>
      <div className={clsx("flex shrink-0 flex-wrap items-center justify-between gap-3")}>
        <PageTitle>Chat</PageTitle>
        <button type="button" disabled={!chat.loaded} onClick={() => setAction("create")} className={clsx("rounded-md bg-action px-3 py-2 text-sm text-on-action", "disabled:opacity-50")}>New chat</button>
      </div>

      {!chat.loaded && !chat.error && <BodyText role="status" tone="muted" className={clsx("mt-6")}>Loading conversations…</BodyText>}
      {chat.error && <div className={clsx("mt-6")}><BodyText role="alert" tone="error">{chat.error}</BodyText><button type="button" onClick={chat.retry} className={clsx("mt-2 text-sm underline")}>Try again</button></div>}
      {chat.loaded && <div className={clsx("mt-6 grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] gap-6 border-t border-ink/10 pt-5 @min-3xl:grid-cols-3 @min-3xl:grid-rows-1")}>
        <section ref={conversationsRef} tabIndex={-1} aria-label="Conversations" className={clsx("flex max-h-48 min-h-0 min-w-0 flex-col overflow-y-auto @min-3xl:max-h-none")}>
          <ListToolbar query={list.query} onQueryChange={list.setQuery} searchPlaceholder="Search conversations" sortValue={list.sortValue} onSortChange={list.setSortValue} sortOptions={sorts} groupBy={groupBy} onGroupByChange={setGroupBy} />
          {!chat.conversations.length && <BodyText tone="muted" className={clsx("mt-5")}>Start a new chat to choose an agent. Your conversations will appear here.</BodyText>}
          {chat.conversations.length > 0 && !list.visible.length && <BodyText tone="muted" className={clsx("mt-5")}>No conversations match your search.</BodyText>}
          <div className={clsx("mt-4 min-h-0 overflow-y-auto")}>
            {groups.map((group) => <div key={group.key}>
              {group.label && <Caption as="h2" tone="muted" className={clsx("px-3 py-3")}>{group.label}</Caption>}
              <ul className={clsx("space-y-1")}>
                {group.items.map((item) => <li key={item.id} className={clsx("relative")}>
                  <button type="button" aria-current={selectedId === item.id ? "true" : undefined} onClick={() => onSelect(item.id)} className={clsx("w-full rounded-md pl-3 pr-12 py-3 text-left", selectedId === item.id ? "bg-ink/7" : "hover:bg-ink/5")}>
                    <span className={clsx("block truncate text-sm font-medium")}>{item.title ?? "New conversation"}</span>
                    <Caption as="span" tone="muted" className={clsx("mt-1 block truncate")}>{chat.connections.find((agent) => agent.id === item.agent_connection_id)?.name ?? "Unavailable connection"}</Caption>
                  </button>
                  <ConversationActions conversation={item} busy={chat.isBusy(item.id)} onRename={chat.rename}
                    onDelete={async (id) => { await chat.remove(id); if (selectedId === id) onSelect(null); }} />
                </li>)}
              </ul>
            </div>)}
          </div>
        </section>
        <section aria-label="Active conversation" {...drop.handlers} className={clsx("relative flex min-h-0 min-w-0 flex-col border-t border-ink/10 pt-5 @min-3xl:col-span-2 @min-3xl:border-l @min-3xl:border-t-0 @min-3xl:pl-6 @min-3xl:pt-0")}>
          {conversation ? <>
            <div className={clsx("flex shrink-0 flex-wrap items-start justify-between gap-3")}>
              <div className={clsx("min-w-0")}>
                <SectionTitle className={clsx("break-words")}>{conversation.title ?? "New conversation"}</SectionTitle>
                <Caption tone="muted" className={clsx("mt-1")}>{connection?.name ?? "Unavailable connection"}{connection && connection.name !== agentLabel(connection.kind) && ` · ${agentLabel(connection.kind)}`}{supportsModelCommand(connection) && ` · ${connection?.model ?? "Default model"}`}</Caption>
              </div>
              <div className={clsx("w-full max-w-56")}><ProfilePicker /></div>
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
            <Composer key={conversation.id} files={files} busy={chat.turn?.busy ?? false} stopping={chat.turn?.stopping ?? false}
              supported={connection !== undefined} ready={chat.messagesLoaded && !chat.messageError}
              custom={connection?.kind === "custom"} modelCommand={supportsModelCommand(connection)} modelHint={modelCommandHint(connection)}
              modelOptions={modelOptionsFor(connection)} onSend={handleSend} onStop={chat.stop} />
          </> : <BodyText tone="muted">{selectedId === null ? "Select a conversation or create one to get started." : "This conversation no longer exists. Select another conversation."}</BodyText>}
          <FileDropOverlay visible={drop.dragging} />
        </section>
      </div>}
      {action === "create" && <AgentPicker onClose={() => setAction(null)} onStart={async (id) => onSelect(await chat.create(id))}
        onResume={() => { setAction(null); list.setQuery(""); conversationsRef.current?.focus(); conversationsRef.current?.scrollIntoView({ block: "start" }); }} />}
    </div>
  );
}
