import type { AgentConnectionRow } from "../../../shared/lib/db";

export type AgentKind = AgentConnectionRow["kind"];

export type KnownAgent = Exclude<AgentKind, "custom">;

export const presets: { value: KnownAgent; label: string; command: string }[] = [
  { value: "claude", label: "Claude", command: "claude" },
  { value: "codex", label: "Codex", command: "codex" },
  { value: "gemini", label: "Gemini", command: "gemini" },
  { value: "copilot", label: "Copilot", command: "copilot" },
  { value: "cursor", label: "Cursor", command: "cursor-agent" },
];

export function agentLabel(kind: AgentKind) {
  return presets.find((preset) => preset.value === kind)?.label ?? "Custom";
}

export function parseArgs(value: string): string[] {
  const args: unknown = JSON.parse(value || "[]");
  if (!Array.isArray(args) || !args.every((arg) => typeof arg === "string" && !arg.includes("\0"))) {
    throw new Error('Enter arguments as a JSON list of strings, for example ["--verbose"].');
  }
  return args;
}
