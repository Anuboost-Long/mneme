import { getActionConnection } from "../../ai-actions/lib/action/actions";
import { createConversation } from "./conversation/actions";
import { startTurn } from "./turns";

export type AssistantEvent = { conversationId: number | null; error?: string };

const listeners = new Set<(event: AssistantEvent) => void>();

export function subscribeAssistant(listener: (event: AssistantEvent) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify(event: AssistantEvent) {
  listeners.forEach((listener) => listener(event));
}

export function openAssistant() {
  notify({ conversationId: null });
}

export async function askAssistant(question: string, pageId: number | null) {
  const connection = await getActionConnection().catch(() => null);
  if (!connection) {
    notify({ conversationId: null, error: "No agent connected yet. Add one in Chat, then ask again." });
    return;
  }
  const conversation = await createConversation(connection.id);
  const context =
    pageId === null
      ? undefined
      : `The user has mneme page id ${pageId} open. When they say "this page", they mean it: read it with get_page.`;
  notify({ conversationId: conversation.id });
  void startTurn(conversation.id, question, [], context);
}
