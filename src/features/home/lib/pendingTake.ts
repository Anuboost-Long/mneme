import type { Take } from "../components/FileRecordingDialog";

// A take recorded on Home but not saved to a page yet. Kept outside the
// widget so leaving Home and coming back doesn't lose it; it lasts until
// it's saved, discarded, or the app quits.
let pending: Take | null = null;

export function getPendingTake() {
  return pending;
}

export function setPendingTake(take: Take | null) {
  pending = take;
}
