import { useRef, useState } from "react";
import clsx from "clsx";
import { useListView, type SortOption } from "../../../shared/lib/useListView";
import { useStoredChoice } from "../../../shared/lib/useStoredChoice";
import { DATE_GROUP_VALUES, groupByDate } from "../../../shared/lib/dateGroups";
import ListToolbar from "../../../shared/ui/ListToolbar";
import { BodyText, Caption, PageTitle } from "../../../shared/ui/Typography";
import type { Conversation } from "../lib/conversations";
import type { useAgentChat } from "../lib/useAgentChat";
import AgentPicker from "../components/AgentPicker";
import ConversationPane from "../components/ConversationPane";
import ConversationActions from "../components/ConversationActions";

const sorts: SortOption<Conversation, "updated" | "title">[] = [
  { value: "updated", label: "Last active", compare: (a, b) => b.updated_at.localeCompare(a.updated_at) || b.id - a.id },
  { value: "title", label: "Title", compare: (a, b) => (a.title ?? "New conversation").localeCompare(b.title ?? "New conversation") || b.id - a.id },
];
const matches = (conversation: Conversation, query: string) => (conversation.title ?? "New conversation").toLowerCase().includes(query);

export default function AgentChatPage({ chat, selectedId, onSelect }: Readonly<{
  chat: ReturnType<typeof useAgentChat>;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}>) {
  const conversationsRef = useRef<HTMLElement>(null);
  const [action, setAction] = useState<"create" | null>(null);
  const list = useListView(chat.conversations, matches, sorts, "mneme.agent-chat.sort");
  const [groupBy, setGroupBy] = useStoredChoice("mneme.agent-chat.group", DATE_GROUP_VALUES, "none");
  const groups = groupByDate(list.visible, (item) => `${item.updated_at.replace(" ", "T")}Z`, groupBy);

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
        <ConversationPane chat={chat} selectedId={selectedId} emptyText="Select a conversation or create one to get started."
          className="border-t border-ink/10 pt-5 @min-3xl:col-span-2 @min-3xl:border-l @min-3xl:border-t-0 @min-3xl:pl-6 @min-3xl:pt-0" />
      </div>}
      {action === "create" && <AgentPicker onClose={() => setAction(null)} onStart={async (id) => onSelect(await chat.create(id))}
        onResume={() => { setAction(null); list.setQuery(""); conversationsRef.current?.focus(); conversationsRef.current?.scrollIntoView({ block: "start" }); }} />}
    </div>
  );
}
