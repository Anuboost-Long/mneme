import { useEffect, useState } from "react";

import { useCourses } from "../features/courses/lib/coursesState";
import {
  eraseItems,
  getDeletedItems,
  restoreItems
} from "../features/recently-deleted/lib/deleted-item/actions";
import type { DeletedItem } from "../features/recently-deleted/lib/deleted-item/types";
import RecentlyDeletedPage from "../features/recently-deleted/pages/RecentlyDeletedPage";

export default function RecentlyDeletedRoute() {
  const { refresh } = useCourses();
  const [items, setItems] = useState<DeletedItem[] | null>(null);

  useEffect(() => {
    let active = true;
    getDeletedItems()
      .then((loaded) => active && setItems(loaded))
      .catch(() => active && setItems([]));
    return () => {
      active = false;
    };
  }, []);

  async function restore(selected: DeletedItem[]) {
    await restoreItems(selected);
    await refresh();
    setItems(await getDeletedItems());
  }

  async function erase(selected: DeletedItem[]) {
    await eraseItems(selected);
    setItems(await getDeletedItems());
  }

  return <RecentlyDeletedPage items={items} onRestore={restore} onErase={erase} />;
}
