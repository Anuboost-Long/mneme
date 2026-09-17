// Numeric, not string, values — stored as a 1-byte SQLite INTEGER instead
// of a multi-byte TEXT column across every course/module/page row.
export enum CompletionStatus {
  NotStarted = 1,
  InProgress = 2,
  Completed = 3,
  RevisionNeeded = 4,
}

export const completionStatusLabels: Record<CompletionStatus, string> = {
  [CompletionStatus.NotStarted]: "Not started",
  [CompletionStatus.InProgress]: "In progress",
  [CompletionStatus.Completed]: "Completed",
  [CompletionStatus.RevisionNeeded]: "Revision needed",
};

// A numeric enum's `Object.values()` also reverse-maps names to numbers,
// so callers that need every status as a plain list (a `<select>`'s
// options, for example) use this instead of `Object.values`.
export const completionStatuses: CompletionStatus[] = [
  CompletionStatus.NotStarted,
  CompletionStatus.InProgress,
  CompletionStatus.Completed,
  CompletionStatus.RevisionNeeded,
];
