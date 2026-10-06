import { recordingSourceLabels } from "@/features/courses/lib/useAudioRecorder";
import Select from "@/shared/ui/Select";
import { Caption } from "@/shared/ui/Typography";
import type { RecordingSource } from "@chain/sdk";
import clsx from "clsx";

export default function RecordingSourcePicker({
  sources,
  source,
  echoCancellation,
  onChange,
  className
}: Readonly<{
  sources: RecordingSource[];
  source: RecordingSource;
  echoCancellation: boolean;
  onChange: (source: RecordingSource) => void;
  className?: string;
}>) {
  if (sources.length < 2) return null;
  return (
    <div className={className}>
      <Select
        label="Record from"
        hideLabel
        compact
        value={source}
        onChange={onChange}
        options={sources.map((value) => ({ value, label: recordingSourceLabels[value] }))}
      />
      {source === "both" && !echoCancellation && (
        <Caption tone="muted" className={clsx("mt-1")}>
          Use headphones, or the mic picks up your speakers as an echo.
        </Caption>
      )}
    </div>
  );
}
