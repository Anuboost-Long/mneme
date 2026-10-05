export const TOOL_CALLS_PER_MESSAGE = 50;
export const SAME_CALLS_IN_A_ROW = 3;

type Budget = { calls: number; lastCall: string; repeats: number };

export type Spend = "ok" | "limit" | "repeat";

const budgets = new Map<number, Budget>();

export function startMessageBudget(conversationId: number) {
  budgets.set(conversationId, { calls: 0, lastCall: "", repeats: 0 });
}

export function spendToolCall(conversationId: number, call: string): Spend {
  const budget = budgets.get(conversationId);
  if (!budget) return "ok";
  if (budget.calls >= TOOL_CALLS_PER_MESSAGE) return "limit";
  budget.repeats = call === budget.lastCall ? budget.repeats + 1 : 1;
  budget.lastCall = call;
  if (budget.repeats > SAME_CALLS_IN_A_ROW) return "repeat";
  budget.calls++;
  return "ok";
}
