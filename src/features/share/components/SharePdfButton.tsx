import { sharePdf, sharePdfError } from "@/features/share/lib/pdf";
import clsx from "clsx";
import { useState } from "react";

export default function SharePdfButton({
  name,
  build,
  disabledReason,
  onError
}: Readonly<{
  name: string;
  build: () => Promise<string> | string;
  disabledReason?: string;
  onError: (message: string | null) => void;
}>) {
  const [busy, setBusy] = useState(false);

  async function share(button: HTMLButtonElement) {
    onError(null);
    setBusy(true);
    try {
      await sharePdf(await build(), name, button.getBoundingClientRect());
    } catch (error) {
      onError(sharePdfError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      disabled={busy || disabledReason !== undefined}
      title={disabledReason}
      onClick={(event) => void share(event.currentTarget)}
      className={clsx(
        "rounded-md border border-ink/15 px-4 py-2 text-sm font-medium",
        "hover:bg-ink/5 disabled:opacity-40 disabled:hover:bg-transparent"
      )}
    >
      {busy ? "Sharing…" : "Share as PDF"}
    </button>
  );
}
