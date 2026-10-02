import type { AgentConnectionRow } from "../../../../shared/lib/db/schema/agent-connection";

export type AgentConnection = Omit<AgentConnectionRow, "args"> & {
  args: string[];
  conversation_count: number;
};
export type ConnectionInput = Pick<AgentConnection, "name" | "kind" | "command" | "args">;
