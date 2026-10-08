import { useState } from "react";

import { exportPdf, pdfError } from "./pdf";

export function usePdfExport(
  name: string,
  build: () => Promise<string> | string,
  onError: (message: string | null) => void
) {
  const [busy, setBusy] = useState<"share" | "save" | null>(null);

  async function run(how: "share" | "save", shareFrom?: DOMRect) {
    onError(null);
    setBusy(how);
    try {
      await exportPdf(await build(), name, shareFrom);
    } catch (error) {
      onError(pdfError(error));
    } finally {
      setBusy(null);
    }
  }

  return {
    busy,
    share: (anchor: HTMLElement) => void run("share", anchor.getBoundingClientRect()),
    save: () => void run("save")
  };
}
