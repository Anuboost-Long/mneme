import type { NewWidget } from "@/features/home/lib/widget/types";
import type { HomeLayoutRow } from "@/shared/lib/db/schema/home-layout";
import { desktop, sql } from "@chain/sdk";

import type { SavedLayout } from "./types";

const layoutTable = () => desktop.storage.table<HomeLayoutRow>("home_layout");

function toLayout(row: HomeLayoutRow): SavedLayout {
  let widgets: NewWidget[] = [];
  try {
    widgets = JSON.parse(row.widgets) as NewWidget[];
  } catch {
    widgets = [];
  }
  return { id: row.id, name: row.name, widgets, created_at: row.created_at };
}

export async function getLayouts() {
  const rows = await layoutTable()
    .orderBy(sql`name COLLATE NOCASE`, "id")
    .all();
  return rows.map(toLayout);
}

export async function hasLayoutNamed(name: string) {
  return !!(await layoutTable()
    .where(sql`name = ${name} COLLATE NOCASE`)
    .first());
}

export async function insertLayout(name: string, widgets: NewWidget[]) {
  return toLayout(await layoutTable().insert({ name, widgets: JSON.stringify(widgets) }));
}

export async function deleteLayoutRow(id: number) {
  await layoutTable().delete(id);
}
