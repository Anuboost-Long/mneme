import { desktop, sql } from "@chain/sdk";

import { savePositions } from "../../../../shared/lib/db/positions";
import type { HomeWidgetRow } from "../../../../shared/lib/db/schema/home-widget";
import type { NewWidget, Widget, WidgetConfig, WidgetSize } from "./types";

const widgetTable = () => desktop.storage.table<HomeWidgetRow>("home_widget");

function toWidget(row: HomeWidgetRow): Widget {
  let config: WidgetConfig = {};
  try {
    config = row.config ? (JSON.parse(row.config) as WidgetConfig) : {};
  } catch {
    config = {};
  }
  return { id: row.id, kind: row.kind, size: row.size as WidgetSize, config };
}

export async function getWidgetsInOrder() {
  const rows = await widgetTable().orderBy("position", "id").all();
  return rows.map(toWidget);
}

export async function insertWidget({ kind, size, config }: NewWidget) {
  const row = await widgetTable().insert({
    kind,
    size,
    config: JSON.stringify(config),
    position: sql`SELECT COALESCE(MAX(position), -1) + 1 FROM home_widget`
  });
  return toWidget(row);
}

export async function insertWidgetWithId(widget: Widget) {
  await widgetTable().insert({
    id: widget.id,
    kind: widget.kind,
    size: widget.size,
    config: JSON.stringify(widget.config)
  });
}

export async function updateWidgetColumns(widget: Widget) {
  await widgetTable().update(widget.id, {
    size: widget.size,
    config: JSON.stringify(widget.config)
  });
}

export async function deleteWidgetRow(id: number) {
  await widgetTable().delete(id);
}

export async function deleteAllWidgets() {
  await widgetTable().delete(sql`1`);
}

export function saveWidgetPositions(ids: number[]) {
  return savePositions("home_widget", ids, 0);
}
