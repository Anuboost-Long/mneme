import type { RecordingStarted } from "@chain/sdk";
import clsx from "clsx";
import { useState } from "react";

import { Caption } from "../../../../shared/ui/Typography";

export default function MicrophoneNotice({
  microphone,
  notice,
  onUseAutomatic,
  className
}: Readonly<{
  microphone: RecordingStarted | null;
  notice: string | null;
  onUseAutomatic: () => void;
  className?: string;
}>) {
  const [switched, setSwitched] = useState(false);
  const bluetooth = microphone?.microphone?.transport === "bluetooth" ? microphone.microphone : null;
  if (!bluetooth && !notice) return null;
  return (
    <div className={clsx("space-y-1", className)}>
      {notice && <Caption tone="muted">{notice}</Caption>}
      {bluetooth && (
        <Caption role="status" tone="error">
          Recording from {bluetooth.name}, at call quality.{" "}
          {microphone?.bluetoothFallback && "No other microphone is connected."}
          {!microphone?.bluetoothFallback && !switched && (
            <button
              type="button"
              onClick={() => {
                onUseAutomatic();
                setSwitched(true);
              }}
              className={clsx(
                "rounded font-medium underline underline-offset-2",
                "hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
              )}
            >
              Use the built-in microphone next time
            </button>
          )}
          {switched && "Your next recording will use the built-in microphone."}
        </Caption>
      )}
    </div>
  );
}
