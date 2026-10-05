import type { AgentPermission } from "./permissions";

export type PendingApproval = {
  toolName: string;
  description: string;
  permission: AgentPermission;
  canAlwaysAllow: boolean;
};

export type ApprovalAnswer = { approved: boolean; always: boolean };

// Matches chain-sdk's AGENT_SERVER_HANDLER_TIMEOUT (agent-server
// CONTRACT.md's Errors section) — past this, native has already sent the
// calling CLI a 504 for this call, so leaving the prompt open any longer
// would just be answering a request nothing is still waiting on.
const APPROVAL_TIMEOUT_MS = 30_000;

// A single pending approval, not a queue: chain-sdk's agent-server forwards
// one HTTP request at a time and doesn't accept the next connection until
// this one's handler resolves (see CONTRACT.md's Non-goals on concurrency),
// so handleMcpRequest — and therefore this module — is never asked to gate
// a second tool call while one is already awaiting an answer.
let pending: PendingApproval | null = null;
let resolvePending: ((answer: ApprovalAnswer) => void) | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribeApprovals(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getPendingApproval() {
  return pending;
}

export function requestApproval(request: PendingApproval): Promise<ApprovalAnswer> {
  return new Promise<ApprovalAnswer>((resolve) => {
    pending = request;
    resolvePending = resolve;
    timer = setTimeout(() => answerApproval(false), APPROVAL_TIMEOUT_MS);
    notify();
  });
}

export function answerApproval(approved: boolean, always = false) {
  if (!resolvePending) return;
  clearTimeout(timer);
  const resolve = resolvePending;
  const allowAlways = approved && always && (pending?.canAlwaysAllow ?? false);
  pending = null;
  resolvePending = null;
  notify();
  resolve({ approved, always: allowAlways });
}
