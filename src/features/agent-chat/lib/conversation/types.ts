import type { AgentConversationRow } from "@/shared/lib/db/schema/agent-conversation";

export enum ConversationMode {
  Ask = 1,
  Agent = 2
}

export type Conversation = Omit<AgentConversationRow, "mode"> & { mode: ConversationMode };
