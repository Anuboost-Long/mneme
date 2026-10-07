import { pageTypeLabels } from "@/features/courses/lib/page/types";

import {
  deleteCustomPageTypeRow,
  getCustomPageTypes,
  insertCustomPageType,
  setCustomPageTypeName
} from "./table";

export { countPagesOfType, getCustomPageTypes } from "./table";

async function checkedName(name: string, id?: number) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Enter a name for the page type.");
  const lower = trimmed.toLowerCase();
  if (Object.values(pageTypeLabels).some((label) => label.toLowerCase() === lower))
    throw new Error(`“${trimmed}” is already a built-in page type.`);
  if (
    (await getCustomPageTypes()).some((type) => type.id !== id && type.name.toLowerCase() === lower)
  )
    throw new Error(`You already have a page type called “${trimmed}”.`);
  return trimmed;
}

export async function createCustomPageType(name: string) {
  return insertCustomPageType(await checkedName(name));
}

export async function renameCustomPageType(id: number, name: string) {
  await setCustomPageTypeName(id, await checkedName(name, id));
}

export async function deleteCustomPageType(id: number) {
  await deleteCustomPageTypeRow(id);
}
