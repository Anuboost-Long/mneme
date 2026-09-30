import { desktop } from "@chain/sdk";

import type { HomeWidgetRow } from "../../../shared/lib/db";

export const widgetSizes = ["small", "medium", "wide", "large"] as const;

export type WidgetSize = (typeof widgetSizes)[number];

// Each widget kind reads the keys it knows; `title` renames any widget.
export type WidgetConfig = { title?: string } & Record<string, unknown>;

export type Widget = { id: number; kind: string; size: WidgetSize; config: WidgetConfig };

export type NewWidget = Omit<Widget, "id">;

// Set once the first layout is written, so a Home the user emptied on
// purpose stays empty instead of filling back up.
const seededKey = "home.widgets-seeded";

function fromRow(row: HomeWidgetRow): Widget {
  let config: WidgetConfig = {};
  try {
    config = row.config ? (JSON.parse(row.config) as WidgetConfig) : {};
  } catch {
    config = {};
  }
  return { id: row.id, kind: row.kind, size: row.size as WidgetSize, config };
}

// React runs effects twice in development; both loads share one pass, so
// the defaults are seeded once and neither reads a half-seeded table.
let loading: Promise<Widget[]> | null = null;

export function getWidgets(defaults: NewWidget[]): Promise<Widget[]> {
  loading ??= loadWidgets(defaults).finally(() => {
    loading = null;
  });
  return loading;
}

async function loadWidgets(defaults: NewWidget[]): Promise<Widget[]> {
  const claim = await desktop.storage.execute("INSERT INTO settings (key, value) VALUES (?, '1') ON CONFLICT(key) DO NOTHING", [seededKey]);
  if (claim.rowsAffected > 0) {
    for (const widget of defaults) await addWidget(widget);
  }
  const rows = await desktop.storage.query<HomeWidgetRow>("SELECT * FROM home_widget ORDER BY position, id");
  return rows.map(fromRow);
}

export async function addWidget({ kind, size, config }: NewWidget): Promise<Widget> {
  const result = await desktop.storage.execute(
    "INSERT INTO home_widget (kind, size, config, position) VALUES (?, ?, ?, (SELECT COALESCE(MAX(position), -1) + 1 FROM home_widget))",
    [kind, size, JSON.stringify(config)]
  );
  return { id: Number(result.lastInsertId), kind, size, config };
}

export async function updateWidget(widget: Widget) {
  await desktop.storage.execute("UPDATE home_widget SET size = ?, config = ? WHERE id = ?", [widget.size, JSON.stringify(widget.config), widget.id]);
}

export async function removeWidget(id: number) {
  await desktop.storage.execute("DELETE FROM home_widget WHERE id = ?", [id]);
}

// Puts a removed widget back where it was, for Undo.
export async function restoreWidget(widget: Widget, order: number[]) {
  await desktop.storage.execute("INSERT INTO home_widget (id, kind, size, config) VALUES (?, ?, ?, ?)", [widget.id, widget.kind, widget.size, JSON.stringify(widget.config)]);
  await reorderWidgets(order);
}

export async function reorderWidgets(ids: number[]) {
  for (const [position, id] of ids.entries()) {
    await desktop.storage.execute("UPDATE home_widget SET position = ? WHERE id = ?", [position, id]);
  }
}

// Swaps the whole layout, for Beautify and its Undo. Ids are new; kinds,
// sizes, settings and order are what's kept.
export async function replaceWidgets(widgets: NewWidget[]): Promise<Widget[]> {
  await desktop.storage.execute("DELETE FROM home_widget");
  const added: Widget[] = [];
  for (const widget of widgets) added.push(await addWidget(widget));
  return added;
}
