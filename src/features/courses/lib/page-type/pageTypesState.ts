import { useSyncExternalStore } from "react";

import { PageType, pageTypeLabels, pageTypes } from "../page/types";
import { getCustomPageTypes } from "./actions";
import { customTypeValue, type CustomPageType } from "./types";

let custom: CustomPageType[] = [];
const listeners = new Set<() => void>();

export async function loadCustomPageTypes() {
  custom = await getCustomPageTypes();
  listeners.forEach((listener) => listener());
}

export function pageTypeLabel(type: number) {
  return (
    pageTypeLabels[type as PageType] ??
    custom.find((item) => customTypeValue(item.id) === type)?.name ??
    pageTypeLabels[PageType.Custom]
  );
}

export function pageTypeOptions() {
  return [
    ...pageTypes.map((value) => ({ value: value as number, label: pageTypeLabels[value] })),
    ...custom.map((item) => ({ value: customTypeValue(item.id), label: item.name }))
  ];
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useCustomPageTypes() {
  return useSyncExternalStore(subscribe, () => custom);
}
