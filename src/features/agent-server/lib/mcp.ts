import type { AgentServerRequest, AgentServerResponse } from "@chain/sdk";
import { isToolContent, tools, type Tool } from "./tools";
import { logActivity } from "./activity/actions";
import { ActivityOutcome } from "./activity/types";
import { requestApproval } from "./approvals";
import { SAME_CALLS_IN_A_ROW, spendToolCall, TOOL_CALLS_PER_MESSAGE } from "./budget";
import { AgentPermission, canAlwaysAllow, getTrustedPermissions, setPermissionTrusted } from "./permissions";
import { getConversation } from "../../agent-chat/lib/conversation/actions";
import { ConversationMode } from "../../agent-chat/lib/conversation/types";
import { errorMessage } from "../../../shared/lib/errorMessage";

const PROTOCOL_VERSION = "2024-11-05";
const SERVER_INFO = { name: "mneme", version: "0.1.0" };

type JsonRpcId = number | string;
type JsonRpcRequest = { jsonrpc: "2.0"; id?: JsonRpcId; method: string; params?: Record<string, unknown> };

function jsonResponse(status: number, body: unknown): AgentServerResponse {
  return { status, headers: { "content-type": "application/json" }, body: JSON.stringify(body) };
}

function rpcResult(id: JsonRpcId, result: unknown): AgentServerResponse {
  return jsonResponse(200, { jsonrpc: "2.0", id, result });
}

function rpcError(id: JsonRpcId | null, code: number, message: string): AgentServerResponse {
  return jsonResponse(200, { jsonrpc: "2.0", id, error: { code, message } });
}

// runTurn.ts appends "?conversation=<id>" to the MCP URL it gives each CLI,
// so the query string is the only channel that ties a tool call back to the
// mneme conversation that opened it — chain-sdk's AgentServerRequest carries
// nothing else conversation-specific (see CONTRACT.md). Falls back to a
// shared bucket (0) for a caller with no such id, e.g. an external MCP
// client using the raw URL Settings shows for its own agent.
function conversationIdFromPath(path: string): number {
  const raw = new URL(path, "http://localhost").searchParams.get("conversation");
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

async function conversationMode(conversationId: number) {
  if (conversationId === 0) return { mode: ConversationMode.Agent, loggedId: null };
  const conversation = await getConversation(conversationId).catch(() => undefined);
  return { mode: conversation?.mode ?? ConversationMode.Ask, loggedId: conversation?.id ?? null };
}

const askModeRefusal =
  "This conversation is in Ask mode, so it can't change the user's workspace. Describe the change in your reply instead; the user can switch to Agent mode to let you make it.";

const failure = (text: string) => ({ content: [{ type: "text", text }], isError: true });

const limitRefusal = `This reply has used its ${TOOL_CALLS_PER_MESSAGE} tool calls. Stop calling tools and tell the user what you found or did so far, and what's left.`;

const repeatRefusal = (tool: string) =>
  `You've made this exact ${tool} call ${SAME_CALLS_IN_A_ROW} times in a row, so calling it again won't change the result. Try a different approach, or stop and tell the user what's blocking you.`;

function describeRead(tool: Tool, args: Record<string, unknown>) {
  const action = tool.name.replace(/_/g, " ");
  const target = typeof args.id === "number" ? ` #${args.id}` : "";
  const query = typeof args.query === "string" ? ` for “${args.query}”` : "";
  return `${action[0].toUpperCase()}${action.slice(1)}${target}${query}.`;
}

async function authorize(
  tool: Tool,
  args: Record<string, unknown>,
  description: string,
  mode: ConversationMode
): Promise<{ outcome: ActivityOutcome; refusal?: string }> {
  const permission = tool.permission ?? AgentPermission.Read;
  if (permission === AgentPermission.Read) return { outcome: ActivityOutcome.Read };
  if (mode === ConversationMode.Ask) return { outcome: ActivityOutcome.BlockedInAskMode, refusal: askModeRefusal };
  try {
    await tool.check?.(args);
  } catch (error) {
    return { outcome: ActivityOutcome.Failed, refusal: errorMessage(error, String(error)) };
  }
  const trustable = canAlwaysAllow(permission) && !(tool.destructive?.(args) ?? false);
  if (trustable && (await getTrustedPermissions()).has(permission)) return { outcome: ActivityOutcome.AllowedAutomatically };
  const answer = await requestApproval({ toolName: tool.name, description, permission, canAlwaysAllow: trustable });
  if (!answer.approved)
    return { outcome: ActivityOutcome.Denied, refusal: "The user denied permission for this action." };
  if (answer.always) await setPermissionTrusted(permission, true);
  return { outcome: ActivityOutcome.Allowed };
}

async function callTool(params: Record<string, unknown> | undefined, conversationId: number) {
  const name = params?.name;
  if (typeof name !== "string") throw new Error("tools/call requires a string \"name\".");
  const tool = tools.find((candidate) => candidate.name === name);
  if (!tool) return failure(`Unknown tool: ${name}`);

  const args = (params?.arguments as Record<string, unknown> | undefined) ?? {};
  const { mode, loggedId } = await conversationMode(conversationId);
  const description = tool.describeCall?.(args) ?? describeRead(tool, args);
  const log = (outcome: ActivityOutcome, detail?: string) =>
    logActivity({
      conversation_id: loggedId,
      tool: tool.name,
      permission: tool.permission ?? AgentPermission.Read,
      description,
      outcome,
      detail
    });

  const spent = spendToolCall(conversationId, `${tool.name} ${JSON.stringify(args)}`);
  if (spent !== "ok") {
    await log(spent === "limit" ? ActivityOutcome.StoppedAtLimit : ActivityOutcome.StoppedRepeating);
    return failure(spent === "limit" ? limitRefusal : repeatRefusal(tool.name));
  }

  const { outcome, refusal } = await authorize(tool, args, description, mode);
  if (refusal) {
    await log(outcome, outcome === ActivityOutcome.Failed ? refusal : undefined);
    return failure(refusal);
  }
  try {
    const result = await tool.execute(args);
    await log(outcome);
    if (isToolContent(result)) return { ...result, isError: false };
    return { content: [{ type: "text", text: JSON.stringify(result) }], isError: false };
  } catch (error) {
    const message = errorMessage(error, String(error));
    await log(ActivityOutcome.Failed, message);
    return failure(message);
  }
}

async function dispatch(method: string, params: Record<string, unknown> | undefined, conversationId: number): Promise<unknown> {
  switch (method) {
    case "initialize":
      return { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: SERVER_INFO };
    case "tools/list": {
      const { mode } = await conversationMode(conversationId);
      const offered =
        mode === ConversationMode.Ask
          ? tools.filter((tool) => (tool.permission ?? AgentPermission.Read) === AgentPermission.Read)
          : tools;
      return { tools: offered.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) };
    }
    case "tools/call":
      return callTool(params, conversationId);
    default:
      throw new Error(`Unknown method: ${method}`);
  }
}

// The MCP "Streamable HTTP" transport, in its simplest single-response
// form: one POST per JSON-RPC message, one JSON body back. No SSE stream
// — nothing here needs the server to push messages the client didn't ask
// for, so there's nothing an event stream would buy over a plain response.
export async function handleMcpRequest(request: AgentServerRequest): Promise<AgentServerResponse> {
  if (request.method !== "POST") return jsonResponse(405, { error: "Method not allowed — POST a JSON-RPC message." });
  const conversationId = conversationIdFromPath(request.path);

  let rpc: JsonRpcRequest;
  try {
    rpc = JSON.parse(request.body);
  } catch {
    return rpcError(null, -32700, "Parse error: request body is not valid JSON.");
  }

  // A JSON-RPC notification (no "id") gets no response body — the client
  // isn't waiting on one. mneme never sends server-initiated messages, so
  // the only notification a client actually sends is "initialized", which
  // needs no action here beyond acknowledging receipt.
  if (rpc.id === undefined) return { status: 202, body: "" };

  try {
    const result = await dispatch(rpc.method, rpc.params, conversationId);
    return rpcResult(rpc.id, result);
  } catch (error) {
    return rpcError(rpc.id, -32000, errorMessage(error, String(error)));
  }
}
