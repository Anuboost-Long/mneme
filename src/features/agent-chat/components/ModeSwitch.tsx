import clsx from "clsx";
import { useId } from "react";

import { Caption } from "../../../shared/ui/Typography";
import { ConversationMode } from "../lib/conversation/types";

const modes = [
  {
    value: ConversationMode.Ask,
    label: "Ask",
    detail: "Reads and searches your pages and answers. It won’t change anything."
  },
  {
    value: ConversationMode.Agent,
    label: "Agent",
    detail: "Can create and change pages. It asks first, unless you’ve chosen Always allow."
  }
];

export default function ModeSwitch({
  mode,
  disabled,
  onChange
}: Readonly<{ mode: ConversationMode; disabled: boolean; onChange: (mode: ConversationMode) => void }>) {
  const name = useId();
  const current = modes.find((item) => item.value === mode) ?? modes[0];

  return (
    <fieldset disabled={disabled} className={clsx("flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1")}>
      <legend className={clsx("sr-only")}>Mode</legend>
      <div className={clsx("inline-flex shrink-0 rounded-md border border-ink/20 p-0.5")}>
        {modes.map((item) => (
          <label
            key={item.value}
            className={clsx(
              "cursor-pointer rounded px-3 py-1 text-sm font-medium",
              "text-muted hover:text-ink has-checked:bg-ink/10 has-checked:text-ink",
              "has-focus-visible:outline-1 has-focus-visible:outline-ink"
            )}
          >
            <input
              type="radio"
              name={name}
              value={item.value}
              checked={mode === item.value}
              onChange={() => onChange(item.value)}
              className={clsx("sr-only")}
            />
            {item.label}
          </label>
        ))}
      </div>
      <Caption tone="muted" className={clsx("min-w-0")}>
        {current.detail}
      </Caption>
    </fieldset>
  );
}
