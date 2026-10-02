import { desktop } from "@chain/sdk";

import { parseStoredDate } from "../../../shared/lib/date";
import { eraseCourse } from "../../courses/lib/courses";
import { eraseModules } from "../../courses/lib/modules";
import { erasePages } from "../../courses/lib/page/actions";

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

export function deletedItemKey(item: Pick<DeletedItem, "kind" | "id">) {
  return `${item.kind}-${item.id}`;
}

export function daysLeft(item: DeletedItem, now = Date.now()) {
  const age = Math.floor((now - parseStoredDate(item.deleted_at).getTime()) / 86_400_000);
  return Math.max(0, KEEP_DAYS - age);
}

export function getDeletedItems() {
  return desktop.storage.query<DeletedItem>(
    `SELECT 'course' AS kind, course.id, course.name, course.icon, course.color, course.deleted_at,
       course.name AS course_name, NULL AS module_name,
       (SELECT COUNT(*) FROM module WHERE module.course_id = course.id AND module.deleted_at = course.deleted_at) AS modules,
       (SELECT COUNT(*) FROM page JOIN module ON module.id = page.module_id
        WHERE module.course_id = course.id AND page.deleted_at = course.deleted_at) AS pages
     FROM course WHERE course.deleted_at IS NOT NULL
     UNION ALL
     SELECT 'module', module.id, module.name, module.icon, course.color, module.deleted_at,
       course.name, NULL, 0,
       (SELECT COUNT(*) FROM page WHERE page.module_id = module.id AND page.deleted_at = module.deleted_at)
     FROM module JOIN course ON course.id = module.course_id
     WHERE module.deleted_at IS NOT NULL AND course.deleted_at IS NOT module.deleted_at
     UNION ALL
     SELECT 'page', page.id, page.title, page.icon, course.color, page.deleted_at,
       course.name, module.name, 0, 0
     FROM page JOIN module ON module.id = page.module_id JOIN course ON course.id = module.course_id
     WHERE page.deleted_at IS NOT NULL AND module.deleted_at IS NOT page.deleted_at
     ORDER BY deleted_at DESC, kind, id`
  );
}

export type DeletedPage = { module_id: number; module_name: string; id: number | null; title: string | null; content: string | null };

export function getDeletedPages({ kind, id }: DeletedItem) {
  switch (kind) {
    case "page":
      return desktop.storage.query<DeletedPage>(
        "SELECT module.id AS module_id, module.name AS module_name, page.id, page.title, page.content FROM page JOIN module ON module.id = page.module_id WHERE page.id = ?",
        [id]
      );
    case "module":
      return desktop.storage.query<DeletedPage>(
        `SELECT module.id AS module_id, module.name AS module_name, page.id, page.title, page.content
         FROM module LEFT JOIN page ON page.module_id = module.id AND page.deleted_at = module.deleted_at
         WHERE module.id = ? ORDER BY page.position, page.created_at`,
        [id]
      );
    case "course":
      return desktop.storage.query<DeletedPage>(
        `SELECT module.id AS module_id, module.name AS module_name, page.id, page.title, page.content
         FROM module JOIN course ON course.id = module.course_id
           LEFT JOIN page ON page.module_id = module.id AND page.deleted_at = course.deleted_at
         WHERE course.id = ? AND module.deleted_at = course.deleted_at
         ORDER BY module.position, module.created_at, page.position, page.created_at`,
        [id]
      );
  }
}

export async function restoreItems(items: DeletedItem[]) {
  await desktop.storage.transaction(async (tx) => {
    for (const { kind, id } of items) {
      switch (kind) {
        case "page":
          await tx.execute("UPDATE course SET deleted_at = NULL WHERE id = (SELECT module.course_id FROM page JOIN module ON module.id = page.module_id WHERE page.id = ?)", [id]);
          await tx.execute("UPDATE module SET deleted_at = NULL WHERE id = (SELECT module_id FROM page WHERE id = ?)", [id]);
          await tx.execute("UPDATE page SET deleted_at = NULL WHERE id = ?", [id]);
          break;
        case "module":
          await tx.execute("UPDATE course SET deleted_at = NULL WHERE id = (SELECT course_id FROM module WHERE id = ?)", [id]);
          await tx.execute("UPDATE page SET deleted_at = NULL WHERE module_id = ? AND deleted_at = (SELECT deleted_at FROM module WHERE id = ?)", [id, id]);
          await tx.execute("UPDATE module SET deleted_at = NULL WHERE id = ?", [id]);
          break;
        case "course":
          await tx.execute(
            `UPDATE page SET deleted_at = NULL
             WHERE deleted_at = (SELECT deleted_at FROM course WHERE id = ?)
               AND module_id IN (SELECT id FROM module WHERE course_id = ? AND deleted_at = (SELECT deleted_at FROM course WHERE id = ?))`,
            [id, id, id]
          );
          await tx.execute("UPDATE module SET deleted_at = NULL WHERE course_id = ? AND deleted_at = (SELECT deleted_at FROM course WHERE id = ?)", [id, id]);
          await tx.execute("UPDATE course SET deleted_at = NULL WHERE id = ?", [id]);
          break;
      }
    }
  });
}

export async function eraseItems(items: DeletedItem[]) {
  for (const { kind, id } of items) {
    switch (kind) {
      case "course":
        await eraseCourse(id);
        break;
      case "module":
        await eraseModules("id = ?", [id]);
        break;
      case "page":
        await erasePages("id = ?", [id]);
        break;
    }
  }
}

export async function purgeExpiredItems() {
  const items = await getDeletedItems();
  await eraseItems(items.filter((item) => daysLeft(item) === 0));
}
