import { toBase64, type ImageData } from "../../../shared/lib/htmlImages";
import { desktop, type ProcessArg, type ProcessOutputChunk } from "@chain/sdk";
import type { AgentConnection } from "./connections";
import type { KnownAgent } from "./presets";
import { appendMessage } from "./messages";
import { updateConversationSessionId } from "./conversations";
import { recordUsage } from "./usage";
import { getAgentServerSnapshot, startAgentServer } from "../../agent-server/lib/agentServerState";
import { getActiveProfile, withProfile, withProfileMessage, type AiProfile } from "../../ai-profiles/lib/profiles";
import { errorMessage } from "../../../shared/lib/errorMessage";
import { formatAttachments, imageMediaType, type ChatAttachment } from "./attachments";

export type ToolActivity = { id: string; name: string; input: string; result?: string; isError?: boolean };

export type TurnEvent =
  | { type: "text"; text: string }
  | { type: "tool"; tool: ToolActivity }
  | { type: "done"; text: string }
  | { type: "error"; message: string };

// Every invoker below only ever calls ctx.onEvent() and mutates these
// tracked fields — runTurn() itself owns persistence (messages, usage,
// session id), not the invokers. This is the "same premise" every CLI is
// translated into regardless of how different its own raw output is.
// `completionSeen`/`resultError` are optional because not every CLI
// reports an explicit end-of-turn signal the way Claude's `result` line
// does — an invoker that has no such concept just never sets them.
type TurnContext = {
  onEvent: (event: TurnEvent) => void;
  finalText: string;
  newSessionId?: string;
  usage?: { input_tokens?: number; output_tokens?: number };
  cost?: number;
  tools: Map<string, ToolActivity>;
  completionSeen?: boolean;
  resultError?: string;
};

type Invoker = {
  // mcpUrl is null when this invocation isn't requesting agent-server tool access.
  // model is null when the connection hasn't set one, meaning the CLI's own default.
  buildArgs(message: string, sessionId: string | null, mcpUrl: string | null, framing: string, model: string | null): string[];
  needsMcp: boolean;
  takesFraming: boolean;
  handleLine(line: string, ctx: TurnContext): void;
  // Only for a CLI that can take images: rewrites the built invocation to
  // carry them. `stdin` is the attached text files, if any.
  withImages?(args: string[], images: StoredImage[], stdin: string | undefined): { args: ProcessArg[]; stdin: string | undefined };
};

// An attached image after runTurn has written it to desktop.files.
type StoredImage = { reference: string; mediaType: string; bytes: Uint8Array };


// Both Claude and Codex inherit mneme's own process cwd (chain-sdk's
// processRunner has no cwd override — see CONTRACT.md), which is mneme's
// own source repository in dev. Without this, a CLI with no other framing
// treats that repo like any other coding workspace and starts reading/
// exploring mneme's own source instead of answering from the user's mneme
// data — confirmed live with Codex. Only Claude and Codex get this: they're
// the two invokers real chat traffic reaches (see AgentPicker.tsx), and
// passthrough/custom commands must stay a literal, assumption-free pass-through.
function framingInstructions(hasTools: boolean): string {
  const toolsLine = hasTools
    ? "You have tool access to the user's mneme data through the mcp__mneme__* tools — use those, not your own file or shell tools, to look up or act on anything about their courses, pages, or other mneme data."
    : "You have no tool access to the user's mneme data in this session — answer from this conversation alone.";
  return `You are the assistant inside mneme's in-app chat feature, talking with the app's user about their own data (courses, pages, notes, etc.). This is not a request to read, search, or modify any files on this machine, including mneme's own source code repository — you are not being asked to do software engineering here. ${toolsLine}`;
}

function parseJsonLine(line: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(line);
    return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// ---- Claude Code ----------------------------------------------------------
// Confirmed live against the real installed CLI. `--mcp-config`'s JSON
// needs a top-level "mcpServers" key — {"mneme":{...}} directly (that's
// `claude mcp add-json`'s shape, a different command) fails the whole
// invocation with "Error: Invalid MCP configuration" on stderr and zero
// usable stdout. Tool-call streaming confirmed too: a "tool_use" content
// block under stream_event (name prefixed "mcp__mneme__" for mneme's own
// tools), its result as a separate top-level {"type":"user",...} line.
type ClaudeStreamEvent = { type?: string; index?: number; content_block?: { type?: string; id?: string; name?: string; input?: unknown }; delta?: { type?: string; text?: string; partial_json?: string } };

function handleClaudeToolResults(parsed: Record<string, unknown>, ctx: TurnContext) {
  const content = (parsed.message as { content?: { type?: string; tool_use_id?: string; content?: unknown; is_error?: boolean }[] } | undefined)?.content;
  for (const block of content ?? []) {
    const tool = ctx.tools.get(block.tool_use_id ?? "");
    if (block.type !== "tool_result" || !tool) continue;
    tool.result = typeof block.content === "string" ? block.content : JSON.stringify(block.content ?? null);
    tool.isError = block.is_error === true;
    ctx.onEvent({ type: "tool", tool: { ...tool } });
  }
}

function handleClaudeResult(parsed: Record<string, unknown>, ctx: TurnContext) {
  ctx.completionSeen = true;
  if (typeof parsed.result === "string") ctx.finalText = parsed.result;
  ctx.usage = parsed.usage as TurnContext["usage"];
  ctx.cost = parsed.total_cost_usd as number | undefined;
  if (parsed.is_error) {
    const errors = parsed.errors as string[] | undefined;
    ctx.resultError = errors?.join("\n") || (typeof parsed.result === "string" ? parsed.result : "") || "The agent could not complete this turn.";
  }
}

// Images: `-p` can't take one in argv, so the whole message moves to stdin
// as one `--input-format stream-json` user message: the prompt and any
// attached files as a text block, then each image as a base64 block.
// Confirmed live, including with --resume: a 16×16 red PNG sent this way
// was answered "Red", and a resumed turn still remembered it.
function claudeWithImages(args: string[], images: StoredImage[], stdin: string | undefined) {
  const [printFlag, prompt, ...rest] = args;
  const content = [
    { type: "text", text: stdin ? `${prompt}\n\n${stdin}` : prompt },
    ...images.map((image) => ({ type: "image", source: { type: "base64", media_type: image.mediaType, data: toBase64(image.bytes) } })),
  ];
  return {
    args: [printFlag, "--input-format", "stream-json", ...rest],
    stdin: `${JSON.stringify({ type: "user", message: { role: "user", content } })}\n`,
  };
}

function createClaudeInvoker(): Invoker {
  const blocks = new Map<number, { tool: ToolActivity; partial: string }>();

  function handleStreamEvent(event: ClaudeStreamEvent | undefined, ctx: TurnContext) {
    if (event?.delta?.type === "text_delta" && event.delta.text) {
      ctx.finalText += event.delta.text;
      ctx.onEvent({ type: "text", text: event.delta.text });
    }
    const block = event?.content_block;
    if (event?.type === "content_block_start" && block?.type === "tool_use" && block.id && block.name?.startsWith("mcp__mneme__")) {
      const tool: ToolActivity = { id: block.id, name: block.name.slice("mcp__mneme__".length), input: JSON.stringify(block.input ?? {}) };
      ctx.tools.set(tool.id, tool);
      blocks.set(event.index ?? 0, { tool, partial: "" });
      ctx.onEvent({ type: "tool", tool: { ...tool } });
    }
    const active = blocks.get(event?.index ?? -1);
    if (active && event?.delta?.type === "input_json_delta") {
      active.partial += event.delta.partial_json ?? "";
      active.tool.input = active.partial;
      ctx.onEvent({ type: "tool", tool: { ...active.tool } });
    }
    if (event?.type === "content_block_stop") blocks.delete(event.index ?? -1);
  }

  return {
    needsMcp: true,
    takesFraming: true,
    withImages: claudeWithImages,
    buildArgs(message, sessionId, mcpUrl, framing, model) {
      const args = ["-p", message, "--append-system-prompt", framing, "--output-format", "stream-json", "--verbose", "--include-partial-messages"];
      if (sessionId) args.push("--resume", sessionId);
      if (model) args.push("--model", model);
      if (mcpUrl) {
        args.push("--mcp-config", JSON.stringify({ mcpServers: { mneme: { type: "http", url: mcpUrl } } }), "--allowedTools", "mcp__mneme__*");
      }
      return args;
    },
    handleLine(line, ctx) {
      const parsed = parseJsonLine(line);
      if (!parsed) return;
      if (typeof parsed.session_id === "string") ctx.newSessionId = parsed.session_id;
      if (parsed.type === "stream_event") handleStreamEvent(parsed.event as ClaudeStreamEvent | undefined, ctx);
      if (parsed.type === "user") handleClaudeToolResults(parsed, ctx);
      if (parsed.type === "result") handleClaudeResult(parsed, ctx);
    },
  };
}

// ---- Codex -----------------------------------------------------------------
// Confirmed live against the real installed CLI: `codex exec <message>
// --json` (fresh turn) / `codex exec resume <thread_id> <message> --json`
// (continuing one) — session id is `thread_id`, not `session_id`. Output is
// whole-item completion events (`item.completed`), NOT token-level deltas
// like Claude's `text_delta` — no flag equivalent to
// `--include-partial-messages` was found, so Codex's text necessarily
// arrives in chunks per completed message, not word-by-word.
//
function createCodexInvoker(): Invoker {
  return {
    needsMcp: true,
    takesFraming: true,
    // `-i, --image <FILE>...` per `codex exec --help` takes a path on disk
    // only, hence a desktop.files reference the native side resolves.
    // Appended last, so a greedy multi-value flag can't swallow the prompt.
    withImages(args, images, stdin) {
      return { args: [...args, ...images.flatMap((image) => ["--image", { fileReference: image.reference }])], stdin };
    },
    buildArgs(message, sessionId, mcpUrl, framing, model) {
      const framedMessage = `${framing}\n\n${message}`;
      const modelArgs = model ? ["--model", model] : [];
      const mcpArgs = mcpUrl ? [
        "--config", 'mcp_servers.mneme.type="http"',
        "--config", `mcp_servers.mneme.url=${JSON.stringify(mcpUrl)}`,
      ] : [];
      if (sessionId) return ["exec", "resume", sessionId, framedMessage, "--json", "--dangerously-bypass-approvals-and-sandbox", "--ignore-user-config", ...mcpArgs, ...modelArgs];
      return ["exec", framedMessage, "--json", "--dangerously-bypass-approvals-and-sandbox", "--ignore-user-config", ...mcpArgs, ...modelArgs];
    },
    handleLine(line, ctx) {
      const parsed = parseJsonLine(line);
      if (!parsed) return;
      if (parsed.type === "thread.started" && typeof parsed.thread_id === "string") ctx.newSessionId = parsed.thread_id;
      const item = parsed.item as { type?: string; text?: string } | undefined;
      if (parsed.type === "item.completed" && item?.type === "agent_message" && typeof item.text === "string") {
        ctx.finalText += (ctx.finalText ? "\n" : "") + item.text;
        ctx.onEvent({ type: "text", text: item.text });
      }
      if (parsed.type === "turn.completed") {
        ctx.completionSeen = true;
        const usage = parsed.usage as { input_tokens?: number; output_tokens?: number } | undefined;
        if (usage) ctx.usage = { input_tokens: usage.input_tokens, output_tokens: usage.output_tokens };
      }
    },
  };
}

// ---- Anything else ----------------------------------------------------------
// Gemini/Copilot/Cursor presets and every user-added custom agent: mneme
// doesn't know their output format, so no structured parsing, no
// tool-calling, no session-resume flag — just the user's message appended
// as the final argv element, raw stdout streamed live like a terminal
// pass-through. This is the floor every configured connection gets, so
// nothing throws "not wired up" — an unverified agent can still actually
// chat, just without the richer presets' features.
//
// `modelFlag`, when given, is the one exception: each preset's flag below
// was confirmed from that CLI's own published docs (not a live install —
// none of these three are installed here to test against, unlike Claude/
// Codex above), not guessed, so forwarding it doesn't compromise the
// "assumption-free" pass-through for the agents mneme actually knows
// nothing about (custom connections still get none).
function createPassthroughInvoker(baseArgs: string[], modelFlag?: string): Invoker {
  return {
    needsMcp: false,
    takesFraming: false,
    buildArgs(message, _sessionId, _mcpUrl, _framing, model) {
      const modelArgs = model && modelFlag ? [modelFlag, model] : [];
      return [...baseArgs, ...modelArgs, message];
    },
    handleLine(line, ctx) {
      ctx.finalText += (ctx.finalText ? "\n" : "") + line;
      ctx.completionSeen = true;
      ctx.onEvent({ type: "text", text: line });
    },
  };
}

// Sources: Gemini CLI's `--model`/`-m` (geminicli.com/docs/cli/cli-reference),
// GitHub Copilot CLI's `--model=MODEL` (docs.github.com/en/copilot/reference/
// copilot-cli-reference/cli-programmatic-reference), Cursor CLI's `--model
// <model>` (cursor.com/docs/cli/reference/parameters).
const passthroughModelFlags: Record<"gemini" | "copilot" | "cursor", string> = {
  gemini: "--model",
  copilot: "--model",
  cursor: "--model",
};

function createInvoker(kind: KnownAgent | "custom", baseArgs: string[]): Invoker {
  if (kind === "claude") return createClaudeInvoker();
  if (kind === "codex") return createCodexInvoker();
  if (kind === "custom") return createPassthroughInvoker(baseArgs);
  return createPassthroughInvoker(baseArgs, passthroughModelFlags[kind]);
}

function buildArgs(invoker: Invoker, connection: AgentConnection, message: string, sessionId: string | null, mcpUrl: string | null, framing: string, profile: AiProfile | null) {
  if (invoker.takesFraming) return invoker.buildArgs(message, sessionId, mcpUrl, withProfile(framing, profile), connection.model);
  return invoker.buildArgs(withProfileMessage(message, profile), sessionId, mcpUrl, framing, connection.model);
}

// A chat turn gets tool access to mneme's own data by pointing an
// invoker's own MCP flag at the already-built agent-server — starting it
// on demand here so sending a message doesn't require a separate trip to
// Settings first.
async function ensureAgentServerUrl(): Promise<string> {
  let snapshot = getAgentServerSnapshot();
  if (snapshot.status === "stopped") {
    await startAgentServer();
    snapshot = getAgentServerSnapshot();
  }
  if (snapshot.status !== "running" || snapshot.port === null) {
    throw new Error(snapshot.error || "Couldn’t start the local agent tool server.");
  }
  return `http://127.0.0.1:${snapshot.port}/mcp`;
}

export async function runTurn(
  connection: AgentConnection,
  conversationId: number,
  sessionId: string | null,
  message: string,
  attachments: ChatAttachment[],
  // Sent to the agent ahead of the message but not saved with it, e.g.
  // which page the user has open.
  context: string | undefined,
  onEvent: (event: TurnEvent) => void,
): Promise<{ kill: () => Promise<void> }> {
  const invoker = createInvoker(connection.kind, connection.args);
  const images = attachments.filter((file) => file.kind === "image");
  if (images.length && !invoker.withImages) throw new Error(`${connection.name} can’t receive images. Remove the image, or chat with Claude or Codex.`);

  // Attached files ride on stdin where the CLI reads it (same split as
  // runAction.ts); anything else gets them inline, under the argv cap.
  const files = formatAttachments(attachments);
  const viaStdin = files !== "" && acceptsStdin(connection);
  if (files && !viaStdin && files.length > MAX_ARGV_CONTEXT_CHARS) throw new Error("These files are too long for this agent. Attach fewer or smaller files, or chat with Claude or Codex.");
  let prompt = context ? `${context}\n\n${message}` : message;
  if (viaStdin) prompt = `${prompt}\n\nThe attached files follow, each in its own <file> element.`;
  else if (files) prompt = `${prompt}\n\n${files}`;

  // Written before the message is saved, so the transcript can show them.
  const stored: StoredImage[] = [];
  for (const image of images) {
    const mediaType = imageMediaType(image.name) ?? "image/png";
    const bytes = image.bytes ?? new Uint8Array();
    image.reference = await desktop.files.write(bytes, { extension: mediaType.split("/")[1] });
    stored.push({ reference: image.reference, mediaType, bytes });
  }

  await appendMessage(conversationId, "user", message, attachments);

  // The conversation id rides along in the query string so mcp.ts's handler
  // can tell which conversation a tool call came from — see mcp.ts's
  // conversationIdFromPath for why that's the only channel available.
  const mcpUrl = invoker.needsMcp ? `${await ensureAgentServerUrl()}?conversation=${conversationId}` : null;
  const built = buildArgs(invoker, connection, prompt, sessionId, mcpUrl, framingInstructions(invoker.needsMcp), await getActiveProfile());
  const command = stored.length && invoker.withImages
    ? invoker.withImages(built, stored, viaStdin ? files : undefined)
    : { args: built, stdin: viaStdin ? files : undefined };
  const { kill, finished } = await invokeAgent(connection, invoker, command.args, onEvent, command.stdin);

  finished.then(async (invocation) => {
    const { ctx } = invocation;
    try {
      await recordInvocationUsage(connection, conversationId, invocation);
      for (const tool of ctx.tools.values()) await appendMessage(conversationId, "tool", JSON.stringify(tool));
      if (ctx.finalText.trim()) await appendMessage(conversationId, "assistant", ctx.finalText.trim());
      const failure = failureMessage(connection, invocation);
      if (failure) {
        await appendMessage(conversationId, "error", failure);
        onEvent({ type: "error", message: failure });
        return;
      }
      if (ctx.newSessionId) await updateConversationSessionId(conversationId, ctx.newSessionId);
      onEvent({ type: "done", text: ctx.finalText.trim() });
    } catch (error) {
      onEvent({ type: "error", message: errorMessage(error, String(error)) });
    }
  });

  return { kill };
}

// Claude's `-p` and Codex's `exec` both read piped stdin as context for
// the prompt given in argv (Claude confirmed live; Codex per its own
// --help) — see docs/chain-sdk-requests/12-process-runner-stdin.md. Every
// other connection is a literal pass-through, so mneme can't assume its
// CLI reads stdin at all.
// Only binds agents that can't take the content on stdin (see
// acceptsStdin): theirs travels as a single argv element, and macOS caps a
// spawn's total argument size at about 1 MB — see
// docs/features/21-ai-quick-actions.md.
export const MAX_ARGV_CONTEXT_CHARS = 200_000;

export function acceptsImages(connection: AgentConnection) {
  return createInvoker(connection.kind, connection.args).withImages !== undefined;
}

export function acceptsStdin(connection: Pick<AgentConnection, "kind">): boolean {
  return connection.kind === "claude" || connection.kind === "codex";
}

// A single prompt with no conversation behind it — no session to resume,
// no agent-server tools, nothing persisted but usage. Used by quick
// actions (features/ai-actions), which pass their own `framing`. `stdin`
// is only for a connection acceptsStdin() allows.
// `images` go with the message where the CLI can take them (see
// acceptsImages); they're written as files only for this run.
export async function runOnce(
  connection: AgentConnection,
  message: string,
  framing: string,
  profile: AiProfile | null,
  onEvent: (event: TurnEvent) => void,
  stdin?: string,
  images: ImageData[] = [],
): Promise<{ kill: () => Promise<void> }> {
  const invoker = createInvoker(connection.kind, connection.args);
  const args = buildArgs(invoker, connection, message, null, null, framing, profile);
  const stored: StoredImage[] = [];
  if (invoker.withImages)
    for (const image of images)
      stored.push({ ...image, reference: await desktop.files.write(image.bytes, { extension: image.mediaType.split("/")[1] }) });
  const command = stored.length && invoker.withImages ? invoker.withImages(args, stored, stdin) : { args, stdin };
  const { kill, finished } = await invokeAgent(connection, invoker, command.args, onEvent, command.stdin);
  void finished.finally(() => Promise.all(stored.map((image) => desktop.files.delete(image.reference).catch(() => undefined))));

  finished.then(async (invocation) => {
    try {
      await recordInvocationUsage(connection, null, invocation);
      const failure = failureMessage(connection, invocation);
      onEvent(failure ? { type: "error", message: failure } : { type: "done", text: invocation.ctx.finalText.trim() });
    } catch (error) {
      onEvent({ type: "error", message: errorMessage(error, String(error)) });
    }
  });

  return { kill };
}

type Invocation = { ctx: TurnContext; result: { code: number | null; killed: boolean }; stderrText: string; durationMs: number };

// Spawns the CLI and turns its stdout into invoker events, line by line.
// Knows nothing about conversations — runTurn/runOnce decide what to
// persist once `finished` resolves.
async function invokeAgent(
  connection: AgentConnection,
  invoker: Invoker,
  args: ProcessArg[],
  onEvent: (event: TurnEvent) => void,
  stdin?: string,
): Promise<{ kill: () => Promise<void>; finished: Promise<Invocation> }> {
  const startedAt = Date.now();

  let buffer = "";
  let stderrText = "";
  const ctx: TurnContext = { onEvent, finalText: "", tools: new Map() };

  function handleLine(line: string) {
    if (!line.trim()) return;
    invoker.handleLine(line, ctx);
  }

  function handleChunk(chunk: ProcessOutputChunk) {
    if (chunk.stream === "stderr") { stderrText += chunk.data; return; }
    buffer += chunk.data;
    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      const line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      handleLine(line);
      newlineIndex = buffer.indexOf("\n");
    }
  }

  const handle = await desktop.processRunner.run(connection.command, args, handleChunk, stdin === undefined ? undefined : { stdin });

  const finished = handle.exited.then((result) => {
    if (buffer.trim()) handleLine(buffer);
    return { ctx, result, stderrText, durationMs: Date.now() - startedAt };
  });

  return { kill: () => handle.kill(), finished };
}

function recordInvocationUsage(connection: AgentConnection, conversationId: number | null, { ctx, result, durationMs }: Invocation) {
  return recordUsage({
    agent_connection_id: connection.id,
    conversation_id: conversationId,
    duration_ms: durationMs,
    input_tokens: ctx.usage?.input_tokens ?? null,
    output_tokens: ctx.usage?.output_tokens ?? null,
    cost_usd: ctx.cost ?? null,
    exit_code: result.code,
  });
}

// Empty when the invocation succeeded.
function failureMessage(connection: AgentConnection, { ctx, result, stderrText }: Invocation): string {
  if (result.killed) return "Generation stopped.";
  if (ctx.resultError) return ctx.resultError;
  // A non-zero exit with nothing usable on stdout means the CLI itself
  // rejected the invocation (bad flags, auth, MCP config) — stderr is
  // where that message actually lands, not stdout's JSON stream.
  if (result.code !== 0) return stderrText.trim() || `${connection.name} exited with code ${result.code ?? "unknown"}.`;
  if (!ctx.completionSeen) return "The agent exited without completing its response. Try again.";
  return "";
}
