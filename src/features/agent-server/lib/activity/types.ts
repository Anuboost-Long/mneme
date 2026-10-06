import type { AgentPermission } from "@/features/agent-server/lib/permissions";

export enum ActivityOutcome {
  Read = 1,
  Allowed = 2,
  AllowedAutomatically = 3,
  Denied = 4,
  Failed = 5,
  BlockedInAskMode = 6,
  StoppedAtLimit = 7,
  StoppedRepeating = 8
}

export const activityOutcomeLabels: Record<ActivityOutcome, string> = {
  [ActivityOutcome.Read]: "Read",
  [ActivityOutcome.Allowed]: "Allowed",
  [ActivityOutcome.AllowedAutomatically]: "Allowed automatically",
  [ActivityOutcome.Denied]: "Denied",
  [ActivityOutcome.Failed]: "Failed",
  [ActivityOutcome.BlockedInAskMode]: "Blocked in Ask mode",
  [ActivityOutcome.StoppedAtLimit]: "Stopped: tool-call limit",
  [ActivityOutcome.StoppedRepeating]: "Stopped: repeated call"
};

export type AgentActivity = {
  id: number;
  conversation_id: number | null;
  conversation_title: string | null;
  tool: string;
  permission: AgentPermission;
  description: string;
  outcome: ActivityOutcome;
  detail: string | null;
  created_at: string;
};

export type NewActivity = Pick<
  AgentActivity,
  "conversation_id" | "tool" | "permission" | "description" | "outcome"
> & {
  detail?: string | null;
};
