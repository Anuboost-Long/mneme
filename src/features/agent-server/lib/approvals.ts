export type PendingApproval = { toolName: string; description: string };

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
let resolvePending: ((approved: boolean) => void) | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

// Once a conversation's agent has one write approved, later writes in that
// same conversation go through without asking again — re-prompting for
// every single edit in a multi-step task would just get clicked through.
// In-memory only: it resets on app restart, same as everything else this
// module tracks.
const approvedConversations = new Set<number>();

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

export function requestApproval(conversationId: number, toolName: string, description: string): Promise<boolean> {
  if (approvedConversations.has(conversationId)) return Promise.resolve(true);
  return new Promise<boolean>((resolve) => {
    pending = { toolName, description };
    resolvePending = (approved) => {
      if (approved) approvedConversations.add(conversationId);
      resolve(approved);
    };
    timer = setTimeout(() => answerApproval(false), APPROVAL_TIMEOUT_MS);
    notify();
  });
}

export function answerApproval(approved: boolean) {
  if (!resolvePending) return;
  clearTimeout(timer);
  const resolve = resolvePending;
  pending = null;
  resolvePending = null;
  notify();
  resolve(approved);
}
