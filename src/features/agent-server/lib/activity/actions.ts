import { insertActivity } from "./table";
import type { NewActivity } from "./types";

export { deleteAllActivity as clearActivity, getRecentActivity } from "./table";

export async function logActivity(activity: NewActivity) {
  await insertActivity(activity).catch(() => undefined);
}
