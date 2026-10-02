import { getSetting } from "./table";

export { claimSetting, deleteSetting, getSetting, putSetting } from "./table";

export async function getSettingId(key: string) {
  const id = Number(await getSetting(key));
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
