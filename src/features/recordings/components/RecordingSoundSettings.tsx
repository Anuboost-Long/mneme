import { desktop, type Microphone, type RecordingAvailability } from "@chain/sdk";
import clsx from "clsx";
import { useEffect, useState } from "react";

import Select from "../../../shared/ui/Select";
import { Caption } from "../../../shared/ui/Typography";
import {
  AUTOMATIC_MICROPHONE,
  recorderAvailability,
  useRecordingMicrophone,
  useRecordingOption,
  type RecordingOption
} from "../../courses/lib/useAudioRecorder";

const options: { option: RecordingOption; label: string; hint: string }[] = [
  {
    option: "echoCancellation",
    label: "Reduce echo when recording both",
    hint: "When you record your microphone and computer audio together, removes the speakers’ sound that the microphone picks up. Not needed with headphones."
  },
  {
    option: "noiseSuppression",
    label: "Reduce background noise",
    hint: "Removes steady noise like fans, hum and hiss from the microphone. Typing and clicks stay."
  },
  {
    option: "autoGainControl",
    label: "Even out voice volume",
    hint: "Raises a quiet or distant voice when you record the microphone alone. It raises background noise too, so it works best with Reduce background noise."
  }
];

const transportLabels: Record<Microphone["transport"], string> = {
  "built-in": "Built-in",
  bluetooth: "Bluetooth, call quality",
  usb: "USB",
  other: "Other"
};

function OptionCheckbox({ option, label, hint }: Readonly<(typeof options)[number]>) {
  const [value, setValue] = useRecordingOption(option);
  return (
    <div>
      <label className={clsx("flex cursor-pointer items-center gap-3 text-sm")}>
        <input
          type="checkbox"
          checked={value === "on"}
          onChange={(event) => setValue(event.target.checked ? "on" : "off")}
          className={clsx("accent-current")}
        />
        <span>{label}</span>
      </label>
      <Caption tone="muted" className={clsx("mt-1 pl-7")}>
        {hint}
      </Caption>
    </div>
  );
}

function MicrophoneSelect({ microphones }: Readonly<{ microphones: Microphone[] }>) {
  const [microphone, setMicrophone] = useRecordingMicrophone();
  const connected = microphone === AUTOMATIC_MICROPHONE || microphones.some(({ id }) => id === microphone);
  return (
    <div>
      <Select
        label="Microphone"
        compact
        value={microphone}
        onChange={setMicrophone}
        options={[
          { value: AUTOMATIC_MICROPHONE, label: "Automatic" },
          ...microphones.map(({ id, name, transport }) => ({
            value: id,
            label: `${name} · ${transportLabels[transport]}`
          })),
          ...(connected ? [] : [{ value: microphone, label: "Chosen microphone (not connected)" }])
        ]}
      />
      <Caption tone="muted" className={clsx("mt-1")}>
        {microphone === AUTOMATIC_MICROPHONE
          ? "Uses your computer’s microphone instead of a Bluetooth headset’s, so the recording and your headphones keep full quality."
          : "A Bluetooth headset’s microphone records at call quality, and lowers what you hear while recording."}
      </Caption>
    </div>
  );
}

export default function RecordingSoundSettings({ className }: Readonly<{ className?: string }>) {
  const [available, setAvailable] = useState<RecordingAvailability | null>(null);
  const [microphones, setMicrophones] = useState<Microphone[]>([]);

  useEffect(() => {
    let active = true;
    void recorderAvailability().then((loaded) => {
      if (!active || !loaded) return;
      setAvailable(loaded);
      if (loaded.microphoneChoice)
        void desktop.audioRecorder
          .microphones()
          .then((listed) => active && setMicrophones(listed))
          .catch(() => undefined);
    });
    return () => {
      active = false;
    };
  }, []);

  const shown = options.filter(({ option }) => available?.[option]);
  if (!available?.microphoneChoice && shown.length === 0) return null;
  return (
    <div className={clsx("space-y-4", className)}>
      {available?.microphoneChoice && <MicrophoneSelect microphones={microphones} />}
      {shown.map((item) => (
        <OptionCheckbox key={item.option} {...item} />
      ))}
    </div>
  );
}
