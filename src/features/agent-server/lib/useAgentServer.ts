import { useSyncExternalStore } from "react";
import { getAgentServerSnapshot, subscribeAgentServer } from "./agentServerState";

export function useAgentServer() {
  return useSyncExternalStore(subscribeAgentServer, getAgentServerSnapshot);
}
