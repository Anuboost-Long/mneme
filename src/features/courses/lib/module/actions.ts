import { CompletionStatus } from "@/features/courses/lib/completion-status";
import { deleteIcon, deleteReplacedIcon, storeIcon } from "@/features/courses/lib/icon/actions";
import { deletionTime, erasePages } from "@/features/courses/lib/page/actions";
import type { ModuleRow } from "@/shared/lib/db/schema/module";
import { sql, type SqlFragment, type Values } from "@chain/sdk";

import {
  deleteModuleRows,
  getModule,
  getModulesMatching,
  insertModule,
  saveModulePositions,
  softDeleteModule,
  updateModuleColumns
} from "./table";
import type { ModuleInput } from "./types";

export {
  getModule,
  getModuleCounts,
  getModuleDestinations,
  getModules,
  searchModuleLinks
} from "./table";

function moduleName(name: string) {
  if (!name.trim()) throw new Error("Enter a module name.");
  return name.trim();
}

function clampProgress(progress: number) {
  return Math.min(100, Math.max(0, Math.round(progress)));
}

export async function createModule(courseId: number, input: ModuleInput) {
  return insertModule({
    course_id: courseId,
    name: moduleName(input.name),
    description: input.description?.trim() || null,
    icon: await storeIcon(input.icon),
    status: input.status ?? CompletionStatus.NotStarted,
    progress: clampProgress(input.progress ?? 0),
    bookmarked: input.bookmarked ? 1 : 0
  });
}

export async function updateModule(id: number, input: Partial<ModuleInput>) {
  const changes: Values<ModuleRow> = {
    name: input.name === undefined ? undefined : moduleName(input.name),
    description: input.description === undefined ? undefined : input.description?.trim() || null,
    icon: input.icon === undefined ? undefined : await storeIcon(input.icon),
    status: input.status,
    progress: input.progress === undefined ? undefined : clampProgress(input.progress),
    bookmarked: input.bookmarked === undefined ? undefined : Number(input.bookmarked)
  };
  const previousIcon = changes.icon === undefined ? null : (await getModule(id))?.icon;
  const module = await updateModuleColumns(id, changes);
  if (!module) throw new Error("This module no longer exists.");
  if (changes.icon !== undefined) await deleteReplacedIcon(previousIcon, module.icon);
  return module;
}

export async function reorderModules(ids: number[]) {
  await saveModulePositions(ids);
}

export async function deleteModule(id: number) {
  await softDeleteModule(id, deletionTime());
}

export function eraseModule(id: number) {
  return eraseModules(sql`id = ${id}`);
}

export async function eraseModules(filter: SqlFragment) {
  await erasePages(sql`module_id IN (SELECT id FROM module WHERE ${filter})`);
  for (const { icon } of await getModulesMatching(filter)) await deleteIcon(icon);
  await deleteModuleRows(filter);
}
