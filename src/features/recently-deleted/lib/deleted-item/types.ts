import { parseStoredDate } from "@/shared/lib/date";

export const KEEP_DAYS = 30;

export type DeletedKind = "course" | "module" | "page";

export type DeletedItem = {
  kind: DeletedKind;
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
  deleted_at: string;
  course_name: string;
  module_name: string | null;
  modules: number;
  pages: number;
};

export type DeletedPage = {
  module_id: number;
  module_name: string;
  id: number | null;
  title: string | null;
  content: string | null;
};

export function deletedItemKey(item: Pick<DeletedItem, "kind" | "id">) {
  return `${item.kind}-${item.id}`;
}

export function daysLeft(item: DeletedItem, now = Date.now()) {
  const age = Math.floor((now - parseStoredDate(item.deleted_at).getTime()) / 86_400_000);
  return Math.max(0, KEEP_DAYS - age);
}
