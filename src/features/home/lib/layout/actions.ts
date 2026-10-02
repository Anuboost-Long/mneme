import type { NewWidget } from "../widget/types";
import { deleteLayoutRow, hasLayoutNamed, insertLayout } from "./table";

export { getLayouts } from "./table";

export async function saveLayout(name: string, widgets: NewWidget[]) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Enter a name for the layout.");
  if (widgets.length === 0) throw new Error("Add a widget to Home before saving it as a layout.");
  if (await hasLayoutNamed(trimmed)) throw new Error(`You already have a layout named “${trimmed}”. Choose another name.`);
  return insertLayout(trimmed, widgets);
}

export async function deleteLayout(id: number) {
  await deleteLayoutRow(id);
}
