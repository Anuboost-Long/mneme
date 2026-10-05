import { desktop, type ChainOs } from "@chain/sdk";
import clsx from "clsx";
import { useEffect, useState } from "react";

import appIcon from "../../../../../asset/app-icon.svg";
import Dialog from "../../../../shared/ui/Dialog";
import { BodyText } from "../../../../shared/ui/Typography";
import type { DeniedAccess } from "../../lib/useAudioRecorder";

type Guide = {
  steps: string[];
  sidebar: string[];
  section: string;
  pane: string;
  switches: { label: string; icon?: string }[];
};

const guides: Record<ChainOs, Guide> = {
  macos: {
    steps: [
      "Open System Settings from the Apple menu.",
      "Select Privacy & Security, then Microphone.",
      "Turn on mneme.",
      "Come back and try again. If mneme still can’t hear you, quit and reopen it."
    ],
    sidebar: ["General", "Sound", "Privacy & Security", "Keyboard"],
    section: "Privacy & Security",
    pane: "Microphone",
    switches: [{ label: "mneme", icon: appIcon }]
  },
  windows: {
    steps: [
      "Open Settings from the Start menu.",
      "Select Privacy & security, then Microphone.",
      "Turn on Microphone access and Let desktop apps access your microphone.",
      "Come back and try again."
    ],
    sidebar: ["System", "Apps", "Privacy & security", "Windows Update"],
    section: "Privacy & security",
    pane: "Microphone",
    switches: [{ label: "Microphone access" }, { label: "Let desktop apps access your microphone" }]
  }
};

const systemAudioGuide: Guide = {
  steps: [
    "Open System Settings from the Apple menu.",
    "Select Privacy & Security, then Screen & System Audio Recording.",
    "Under System Audio Recording Only, turn on mneme.",
    "Come back and try again. If mneme still can’t record, quit and reopen it."
  ],
  sidebar: ["General", "Sound", "Privacy & Security", "Keyboard"],
  section: "Privacy & Security",
  pane: "Screen & System Audio Recording",
  switches: [{ label: "mneme", icon: appIcon }]
};

export default function MicrophoneAccessDialog({
  open,
  access = "microphone",
  onRetry,
  onClose
}: Readonly<{ open: boolean; access?: DeniedAccess; onRetry: () => void; onClose: () => void }>) {
  const [os, setOs] = useState<ChainOs>("macos");

  useEffect(() => {
    let active = true;
    desktop.platform
      .getInfo()
      .then((info) => active && setOs(info.os))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const systemAudio = access === "system" && os === "macos";
  const guide = systemAudio ? systemAudioGuide : guides[os];

  return (
    <Dialog
      open={open}
      title={systemAudio ? "Turn on computer audio recording" : "Turn on microphone access"}
      onClose={onClose}
    >
      {(close, complete) => (
        <>
          <BodyText tone="muted">
            mneme needs your permission to{" "}
            {systemAudio ? "record the sound your computer plays" : "use the microphone"}. You can
            turn it on in {os === "macos" ? "System Settings" : "Settings"}.
          </BodyText>
          <SettingsPreview guide={guide} os={os} />
          <ol className={clsx("mt-6 space-y-3")}>
            {guide.steps.map((step, index) => (
              <li key={step} className={clsx("flex gap-3")}>
                <span
                  aria-hidden="true"
                  className={clsx(
                    "flex size-6 shrink-0 items-center justify-center rounded-full",
                    "bg-ink/10 text-xs font-medium tabular-nums"
                  )}
                >
                  {index + 1}
                </span>
                <BodyText as="span">{step}</BodyText>
              </li>
            ))}
          </ol>
          <div className={clsx("mt-8 flex flex-wrap justify-end gap-3")}>
            <button
              type="button"
              onClick={close}
              className={clsx(
                "rounded-md border border-ink/15 px-4 py-2 text-sm",
                "hover:bg-ink/5"
              )}
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => complete(onRetry)}
              className={clsx(
                "rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action",
                "hover:bg-action/85"
              )}
            >
              Try recording again
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}

// A sketch of the settings window with the switch to turn on, not a
// screenshot: it only has to make the path recognizable.
function SettingsPreview({ guide, os }: Readonly<{ guide: Guide; os: ChainOs }>) {
  return (
    <div
      aria-hidden="true"
      className={clsx(
        "mt-5 overflow-hidden rounded-lg border border-ink/15",
        "bg-ink/5 text-xs select-none"
      )}
    >
      <div className={clsx("flex h-7 items-center gap-1.5 border-b border-ink/10 px-3")}>
        {os === "macos" ? (
          ["bg-red-400", "bg-amber-400", "bg-green-500"].map((color) => (
            <span key={color} className={clsx("size-2.5 rounded-full", color)} />
          ))
        ) : (
          <span className={clsx("text-muted")}>Settings</span>
        )}
      </div>
      <div className={clsx("flex min-h-36")}>
        <ul className={clsx("w-2/5 shrink-0 space-y-0.5 border-r border-ink/10 p-2")}>
          {guide.sidebar.map((item) => (
            <li
              key={item}
              className={clsx(
                "truncate rounded px-2 py-1",
                item === guide.section ? "bg-ink/15 font-medium text-ink" : "text-muted"
              )}
            >
              {item}
            </li>
          ))}
        </ul>
        <div className={clsx("min-w-0 flex-1 p-3")}>
          <p className={clsx("truncate text-muted")}>
            {guide.section} <span className={clsx("text-ink")}>› {guide.pane}</span>
          </p>
          <ul className={clsx("mt-3 space-y-2")}>
            {guide.switches.map(({ label, icon }) => (
              <li
                key={label}
                className={clsx(
                  "flex items-center gap-2 rounded-md px-2 py-1.5",
                  "bg-surface ring-2 ring-accent"
                )}
              >
                {icon && <img src={icon} alt="" className={clsx("size-4 rounded")} />}
                <span className={clsx("min-w-0 flex-1 truncate text-ink")}>{label}</span>
                <span
                  className={clsx(
                    "flex h-4 w-7 shrink-0 items-center justify-end rounded-full p-0.5",
                    "bg-accent"
                  )}
                >
                  <span className={clsx("size-3 rounded-full bg-chain-navy")} />
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
