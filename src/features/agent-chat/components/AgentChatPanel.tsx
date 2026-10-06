import { subscribeAssistant } from "@/features/agent-chat/lib/assistant";
import { useAgentChat } from "@/features/agent-chat/lib/useAgentChat";
import Select from "@/shared/ui/Select";
import { BodyText } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

import AgentPicker from "./AgentPicker";
import ConversationPane from "./ConversationPane";

const CONVERSATION_KEY = "mneme.ai-panel.conversation";

function storedConversation() {
  try {
    const id = Number(localStorage.getItem(CONVERSATION_KEY));
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

// Agent chat beside whatever is open. On a page, each message goes with
// that page's context, so "this page" means something to the agent.
export default function AgentChatPanel({
  pageId,
  onClose
}: Readonly<{ pageId: number | null; onClose: () => void }>) {
  const [selectedId, setSelectedId] = useState(storedConversation);
  const [picking, setPicking] = useState(false);
  const [assistantError, setAssistantError] = useState("");
  const chat = useAgentChat(selectedId);
  const refreshConversations = useRef(chat.refreshConversations);
  refreshConversations.current = chat.refreshConversations;

  useEffect(
    () =>
      subscribeAssistant(({ conversationId, error }) => {
        setAssistantError(error ?? "");
        if (conversationId === null) return;
        select(conversationId);
        void refreshConversations.current();
      }),
    []
  );

  function select(id: number | null) {
    setSelectedId(id);
    try {
      if (id === null) localStorage.removeItem(CONVERSATION_KEY);
      else localStorage.setItem(CONVERSATION_KEY, String(id));
    } catch {
      return;
    }
  }

  return (
    <aside
      aria-label="Agent chat"
      className={clsx("flex h-full min-h-0 w-full flex-col bg-surface", "border-l border-ink/10")}
    >
      <div className={clsx("flex shrink-0 items-center gap-2 border-b border-ink/10 px-3 py-2")}>
        <Select
          compact
          hideLabel
          label="Conversation"
          value={selectedId ?? 0}
          disabled={!chat.loaded}
          onChange={(id) => select(id || null)}
          options={[
            { value: 0, label: "Choose a conversation" },
            ...chat.conversations.map((conversation) => ({
              value: conversation.id,
              label: conversation.title ?? "New conversation"
            }))
          ]}
          className={clsx("min-w-0 flex-1")}
        />
        <button
          type="button"
          disabled={!chat.loaded}
          onClick={() => setPicking(true)}
          className={clsx(
            "h-8 shrink-0 rounded-md bg-action px-3 text-sm text-on-action",
            "hover:bg-action/85 disabled:opacity-50"
          )}
        >
          New chat
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close agent chat"
          title="Close agent chat"
          className={clsx(
            "grid size-8 shrink-0 place-items-center rounded-md text-muted",
            "hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
          )}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      {assistantError && (
        <BodyText
          role="alert"
          tone="error"
          className={clsx("shrink-0 border-b border-ink/10 px-3 py-2")}
        >
          {assistantError}
        </BodyText>
      )}
      {!chat.loaded && !chat.error && (
        <BodyText role="status" tone="muted" className={clsx("p-4")}>
          Loading conversations…
        </BodyText>
      )}
      {chat.error && (
        <div className={clsx("p-4")}>
          <BodyText role="alert" tone="error">
            {chat.error}
          </BodyText>
          <button type="button" onClick={chat.retry} className={clsx("mt-2 text-sm underline")}>
            Try again
          </button>
        </div>
      )}
      {chat.loaded && (
        <ConversationPane
          chat={chat}
          selectedId={selectedId}
          pageId={pageId}
          emptyText="Choose a conversation or start a new chat."
          compact
          className={clsx("flex-1 px-4 pt-4 pb-3")}
        />
      )}
      <AgentPicker
        open={picking}
        onClose={() => setPicking(false)}
        onStart={async (id) => select(await chat.create(id))}
        onResume={() => setPicking(false)}
      />
    </aside>
  );
}
