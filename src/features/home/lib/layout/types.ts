import type { NewWidget } from "../widget/types";

export type SavedLayout = { id: number; name: string; widgets: NewWidget[]; created_at: string };
