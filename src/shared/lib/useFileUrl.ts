import { desktop } from "@chain/sdk";
import { useEffect, useState } from "react";

// The webview URL for a desktop.files reference, or undefined while it
// resolves or when there's no file.
export function useFileUrl(reference: string | null | undefined) {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    setUrl(undefined);
    if (!reference) return;
    let active = true;
    desktop.files
      .url(reference)
      .then((resolved) => active && setUrl(resolved))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [reference]);

  return url;
}
