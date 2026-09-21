import { useSyncExternalStore } from "react";
import { getPendingApproval, subscribeApprovals } from "./approvals";

export function usePendingApproval() {
  return useSyncExternalStore(subscribeApprovals, getPendingApproval);
}
