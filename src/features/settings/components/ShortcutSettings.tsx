import { useShortcuts } from "@/shared/lib/shortcuts/shortcutsState";
import {
  comboFromEvent,
  formatCombo,
  shortcutProblem,
  shortcuts,
  type ShortcutId
} from "@/shared/lib/shortcuts/types";
import { BodyText, SectionTitle } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect, useState } from "react";

const rowButton = clsx(
  "h-8 rounded-md px-2.5 text-sm text-muted",
  "hover:bg-ink/5 hover:text-ink focus-visible:outline-2 focus-visible:outline-ink"
);

export default function ShortcutSettings() {
  const { bindings, overrides, change, reset, resetAll } = useShortcuts();
  const [recording, setRecording] = useState<ShortcutId | null>(null);
  const [problem, setProblem] = useState("");
  const [error, setError] = useState("");

  function startRecording(id: ShortcutId) {
    setRecording(id);
    setProblem("");
  }

  function stopRecording() {
    setRecording(null);
    setProblem("");
  }

  function save(task: Promise<void>) {
    setError("");
    task.catch(() =>
      setError("Couldn’t save your shortcuts. Your previous keys still work. Try again.")
    );
  }

  useEffect(() => {
    if (!recording) return;
    const id = recording;
    function capture(event: KeyboardEvent) {
      const plain = !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
      if (event.key === "Tab" && plain) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (event.key === "Escape" && plain) {
        stopRecording();
        return;
      }
      const combo = comboFromEvent(event);
      if (!combo) return;
      const issue = shortcutProblem(id, combo, bindings);
      if (issue) {
        setProblem(issue);
        return;
      }
      stopRecording();
      save(change(id, combo));
    }
    window.addEventListener("keydown", capture, { capture: true });
    return () => window.removeEventListener("keydown", capture, { capture: true });
  });

  return (
    <section
      aria-labelledby="shortcuts-title"
      className={clsx("grid gap-6 border-t border-ink/10 py-6 @min-3xl:grid-cols-3")}
    >
      <div>
        <SectionTitle id="shortcuts-title">Keyboard shortcuts</SectionTitle>
        <BodyText tone="muted" className={clsx("mt-2 max-w-xs")}>
          Change the keys for common actions. Changes apply right away.
        </BodyText>
      </div>
      <div className={clsx("min-w-0 w-full max-w-xl @min-3xl:col-span-2")}>
        <ul className={clsx("divide-y divide-ink/10 border-y border-ink/10")}>
          {shortcuts.map(({ id, label }) => {
            const active = recording === id;
            return (
              <li
                key={id}
                className={clsx("flex flex-wrap items-center gap-x-3 gap-y-2", "py-2.5")}
              >
                <span className={clsx("min-w-0 flex-1 text-sm")}>{label}</span>
                {active ? (
                  <output className={clsx("text-sm text-muted")}>Press the new keys</output>
                ) : (
                  <kbd
                    className={clsx(
                      "inline-flex h-7 min-w-7 items-center justify-center rounded-md",
                      "border border-ink/15",
                      "font-mono text-xs text-ink",
                      "px-2"
                    )}
                  >
                    {formatCombo(bindings[id])}
                  </kbd>
                )}
                <button
                  type="button"
                  aria-label={active ? `Cancel changing “${label}”` : `Change “${label}”`}
                  onClick={() => (active ? stopRecording() : startRecording(id))}
                  className={rowButton}
                >
                  {active ? "Cancel" : "Change"}
                </button>
                {overrides[id] && !active && (
                  <button
                    type="button"
                    aria-label={`Reset “${label}”`}
                    onClick={() => save(reset(id))}
                    className={rowButton}
                  >
                    Reset
                  </button>
                )}
                {active && problem && (
                  <BodyText role="alert" tone="error" className={clsx("w-full")}>
                    {problem}
                  </BodyText>
                )}
              </li>
            );
          })}
        </ul>
        {Object.keys(overrides).length > 0 && (
          <button
            type="button"
            onClick={() => {
              stopRecording();
              save(resetAll());
            }}
            className={clsx(
              "mt-4 h-8 rounded-md border border-ink/15 px-3 text-sm",
              "hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-ink"
            )}
          >
            Reset all shortcuts
          </button>
        )}
        {error && (
          <BodyText role="alert" tone="error" className={clsx("mt-3")}>
            {error}
          </BodyText>
        )}
      </div>
    </section>
  );
}
