import type { CustomPageTypeRow } from "../../../../shared/lib/db/schema/custom-page-type";

export type CustomPageType = CustomPageTypeRow;

export const CUSTOM_TYPE_BASE = 100;

export const customTypeValue = (id: number) => CUSTOM_TYPE_BASE + id;
