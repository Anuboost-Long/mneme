import { eraseCourse } from "../../../courses/lib/course/actions";
import { eraseModule } from "../../../courses/lib/module/actions";
import { erasePage } from "../../../courses/lib/page/actions";
import { getDeletedItems, restoreDeleted } from "./table";
import { daysLeft, type DeletedItem } from "./types";

export { getDeletedItems, getDeletedPages } from "./table";

export async function restoreItems(items: DeletedItem[]) {
  await restoreDeleted(items);
}

export async function eraseItems(items: DeletedItem[]) {
  for (const { kind, id } of items) {
    switch (kind) {
      case "course":
        await eraseCourse(id);
        break;
      case "module":
        await eraseModule(id);
        break;
      case "page":
        await erasePage(id);
        break;
    }
  }
}

export async function purgeExpiredItems() {
  const items = await getDeletedItems();
  await eraseItems(items.filter((item) => daysLeft(item) === 0));
}
