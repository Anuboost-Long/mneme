import { errorMessage } from "@/shared/lib/errorMessage";
import { desktop, type ChainError } from "@chain/sdk";

import { handleMcpRequest } from "./mcp";

export type AgentServerStatus = "stopped" | "starting" | "running" | "stopping";
export type AgentServerState = {
  status: AgentServerStatus;
  port: number | null;
  error: string | null;
};

// Module-level, not component state: desktop.agentServer allows only one
// server per app run, so its running/port status is a singleton that must
// survive navigating away from whichever screen started it — not
// something owned by a component's own lifecycle.
let state: AgentServerState = { status: "stopped", port: null, error: null };
const listeners = new Set<() => void>();

function setState(patch: Partial<AgentServerState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export function subscribeAgentServer(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAgentServerSnapshot() {
  return state;
}

export async function startAgentServer() {
  if (state.status !== "stopped") return;
  setState({ status: "starting", error: null });
  try {
    const info = await desktop.agentServer.start(handleMcpRequest);
    setState({ status: "running", port: info.port });
  } catch (error) {
    // A dev-mode page reload (Vite's dependency pre-bundling can force one
    // mid-session) wipes this module's `state` back to "stopped" while the
    // native server it started keeps running — this state genuinely thinks
    // it's stopped when it isn't, not a bug in the check above. `start()`
    // then correctly rejects UNAVAILABLE against the still-running native
    // server; recovering by stopping and retrying once is what the module
    // itself would already be doing if its state hadn't been wiped out from
    // under it, and it's the only path that doesn't need the user to
    // restart the whole app.
    if ((error as ChainError)?.code === "UNAVAILABLE") {
      try {
        await desktop.agentServer.stop();
        const info = await desktop.agentServer.start(handleMcpRequest);
        setState({ status: "running", port: info.port });
        return;
      } catch {
        // fall through to the normal error path below
      }
    }
    setState({ status: "stopped", error: errorMessage(error, "Couldn’t start the agent server.") });
  }
}

export async function stopAgentServer() {
  if (state.status !== "running") return;
  setState({ status: "stopping" });
  try {
    await desktop.agentServer.stop();
  } finally {
    setState({ status: "stopped", port: null });
  }
}
