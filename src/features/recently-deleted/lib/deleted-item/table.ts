import type { CourseRow } from "@/shared/lib/db/schema/course";
import type { ModuleRow } from "@/shared/lib/db/schema/module";
import type { PageRow } from "@/shared/lib/db/schema/page";
import { desktop, sql } from "@chain/sdk";

import type { DeletedItem, DeletedPage } from "./types";

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
     ORDER BY deleted_at DESC, kind, id`,
    []
  );
}

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

export function restoreDeleted(items: DeletedItem[]) {
  return desktop.storage.transaction(async (tx) => {
    const courses = tx.table<CourseRow>("course");
    const modules = tx.table<ModuleRow>("module");
    const pages = tx.table<PageRow>("page");
    const restored = { deleted_at: null };
    for (const { kind, id } of items) {
      switch (kind) {
        case "page":
          await courses.update(
            sql`id = (SELECT module.course_id FROM page JOIN module ON module.id = page.module_id WHERE page.id = ${id})`,
            restored
          );
          await modules.update(sql`id = (SELECT module_id FROM page WHERE id = ${id})`, restored);
          await pages.update(id, restored);
          break;
        case "module":
          await courses.update(sql`id = (SELECT course_id FROM module WHERE id = ${id})`, restored);
          await pages.update(
            sql`module_id = ${id} AND deleted_at = (SELECT deleted_at FROM module WHERE id = ${id})`,
            restored
          );
          await modules.update(id, restored);
          break;
        case "course": {
          const deletedAt = sql`(SELECT deleted_at FROM course WHERE id = ${id})`;
          await pages.update(
            sql`deleted_at = ${deletedAt} AND module_id IN (SELECT id FROM module WHERE course_id = ${id} AND deleted_at = ${deletedAt})`,
            restored
          );
          await modules.update(sql`course_id = ${id} AND deleted_at = ${deletedAt}`, restored);
          await courses.update(id, restored);
          break;
        }
      }
    }
  });
}
