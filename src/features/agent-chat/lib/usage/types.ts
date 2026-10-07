export type UsageSummary = {
  invocation_count: number;
  known_cost_count: number;
  total_cost: number | null;
  last_used: string | null;
};
