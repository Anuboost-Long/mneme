import type { AgentServerRequest, AgentServerResponse } from "@chain/sdk";
import { tools } from "./tools";
import { requestApproval } from "./approvals";
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

async function callTool(params: Record<string, unknown> | undefined, conversationId: number) {
  const name = params?.name;
  if (typeof name !== "string") throw new Error("tools/call requires a string \"name\".");
  const tool = tools.find((candidate) => candidate.name === name);
  if (!tool) return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };

  const args = (params?.arguments as Record<string, unknown> | undefined) ?? {};
  if (tool.mutates) {
    const description = tool.describeCall?.(args) ?? `Run ${tool.name}.`;
    const approved = await requestApproval(conversationId, tool.name, description);
    if (!approved) return { content: [{ type: "text", text: "The user denied permission for this action." }], isError: true };
  }
  try {
    const result = await tool.execute(args);
    return { content: [{ type: "text", text: JSON.stringify(result) }], isError: false };
  } catch (error) {
    return { content: [{ type: "text", text: errorMessage(error, String(error)) }], isError: true };
  }
}

async function dispatch(method: string, params: Record<string, unknown> | undefined, conversationId: number): Promise<unknown> {
  switch (method) {
    case "initialize":
      return { protocolVersion: PROTOCOL_VERSION, capabilities: { tools: {} }, serverInfo: SERVER_INFO };
    case "tools/list":
      return { tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) };
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
