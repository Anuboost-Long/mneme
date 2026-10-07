import type { AgentConnection } from "./connection/types";

export type ParsedCommand = { name: string; args: string };

// A leading "/" in the composer is a client-side command, never sent to the
// CLI — invocation is `-p`/`exec` (see runTurn.ts), which has no interactive
// slash-command handling of its own the way a TUI session would.
export function parseCommand(message: string): ParsedCommand | null {
  const trimmed = message.trim();
  if (!trimmed.startsWith("/")) return null;
  const [name, ...rest] = trimmed.slice(1).split(/\s+/);
  return { name: name.toLowerCase(), args: rest.join(" ") };
}

// Hint wording and the flag each one maps to (runTurn.ts's
// passthroughModelFlags) are both sourced from each CLI's own published
// docs — see runTurn.ts's comment on passthroughModelFlags for links.
const modelHints: Partial<Record<AgentConnection["kind"], string>> = {
  claude:
    "An alias for the latest model (opus, sonnet, fable, haiku) or a full model name. /model alone resets to Claude Code's own default.",
  codex: "A model name Codex accepts. /model alone resets to Codex's own default.",
  gemini:
    "An alias (auto, pro, flash, flash-lite) or a full model name like gemini-2.5-pro. /model alone resets to Gemini CLI's own default.",
  copilot:
    "A model name Copilot CLI accepts, e.g. gpt-5.4 or claude-haiku-4.5. /model alone resets to Copilot's own default.",
  cursor:
    "A model name Cursor CLI accepts, e.g. claude-3-5-sonnet — run \"cursor-agent models\" in a terminal to see what's available for your account. /model alone resets to Cursor's own default."
};

export function supportsModelCommand(
  connection: Pick<AgentConnection, "kind"> | undefined
): boolean {
  return connection !== undefined && connection.kind !== "custom";
}

export function modelCommandHint(connection: Pick<AgentConnection, "kind"> | undefined): string {
  return (connection && modelHints[connection.kind]) || "";
}

export function isModelCommand(name: string): boolean {
  return name === "model" || name === "models";
}

// Only Claude's and Gemini's aliases are stable, documented short names
// worth surfacing as a picker. Codex, Copilot, and Cursor accept arbitrary
// model names with no fixed alias set — free-text /model only for those
// (Cursor's own "cursor-agent models" lists what's available per-account,
// which the hint above points to instead of guessing at a static list).
const modelAliases: Partial<Record<AgentConnection["kind"], string[]>> = {
  claude: ["opus", "sonnet", "fable", "haiku"],
  gemini: ["auto", "pro", "flash", "flash-lite"]
};

export function modelOptionsFor(connection: Pick<AgentConnection, "kind"> | undefined): string[] {
  return (connection && modelAliases[connection.kind]) || [];
}

// Recognizes "/model" or "/models" (an easy typo, and the natural guess for
// "list the models") at the start of the composer text, returning the text
// typed after it — "" for "/model" alone — or null when this isn't the
// command at all, so the composer knows whether to show the model picker.
export function matchModelCommand(message: string): string | null {
  const match = /^\/models?(?:\s+(.*))?$/i.exec(message.trim());
  return match ? (match[1] ?? "") : null;
}
