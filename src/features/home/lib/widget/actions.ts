import { claimSetting } from "@/shared/lib/settings/actions";

import {
  deleteAllWidgets,
  deleteWidgetRow,
  getWidgetsInOrder,
  insertWidget,
  insertWidgetWithId,
  saveWidgetPositions,
  updateWidgetColumns
} from "./table";
import type { NewWidget, Widget } from "./types";

const seededKey = "home.widgets-seeded";

let loading: Promise<Widget[]> | null = null;

export function getWidgets(defaults: NewWidget[]): Promise<Widget[]> {
  loading ??= loadWidgets(defaults).finally(() => {
    loading = null;
  });
  return loading;
}

async function loadWidgets(defaults: NewWidget[]) {
  if (await claimSetting(seededKey, "1")) {
    for (const widget of defaults) await addWidget(widget);
  }
  return getWidgetsInOrder();
}

export function addWidget(widget: NewWidget) {
  return insertWidget(widget);
}

export async function updateWidget(widget: Widget) {
  await updateWidgetColumns(widget);
}

export async function removeWidget(id: number) {
  await deleteWidgetRow(id);
}

export async function restoreWidget(widget: Widget, order: number[]) {
  await insertWidgetWithId(widget);
  await reorderWidgets(order);
}

export async function reorderWidgets(ids: number[]) {
  await saveWidgetPositions(ids);
}

export async function replaceWidgets(widgets: NewWidget[]): Promise<Widget[]> {
  await deleteAllWidgets();
  const added: Widget[] = [];
  for (const widget of widgets) added.push(await addWidget(widget));
  return added;
}
