import { useEffect, useState } from "react";

// A widget's data, loaded when it mounts and again when `key` (its
// settings, say) changes. Undefined while loading; a failed load stays
// undefined, since a widget with nothing to show says so on its own.
export function useWidgetData<T>(load: () => Promise<T>, key: string) {
  const [data, setData] = useState<T>();

  useEffect(() => {
    let active = true;
    load()
      .then((loaded) => active && setData(loaded))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [key]);

  return data;
}
