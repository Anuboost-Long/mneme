import type { NewWidget } from "@/features/home/lib/widget/types";

export type SavedLayout = { id: number; name: string; widgets: NewWidget[]; created_at: string };
