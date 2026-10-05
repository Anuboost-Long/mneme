import clsx from "clsx";
import { useEffect, useState } from "react";

import { useResetOnOpen } from "../../../shared/lib/dialogState";
import { errorMessage } from "../../../shared/lib/errorMessage";
import Dialog from "../../../shared/ui/Dialog";
import { TextArea, TextInput } from "../../../shared/ui/Input";
import { BodyText } from "../../../shared/ui/Typography";
import { createConnection, getConnections } from "../lib/connection/actions";
import type { AgentConnection } from "../lib/connection/types";
import { detectAgents, type DetectedAgent } from "../lib/detectAgents";
import { parseArgs, presets, type KnownAgent } from "../lib/presets";

function Chevron() {
  return (
    <svg
      aria-hidden="true"
      className={clsx("size-4")}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 4 4 4-4 4" />
    </svg>
  );
}

function AgentIcon({ kind }: Readonly<{ kind: KnownAgent | "custom" }>) {
  const className = clsx(
    "flex size-8 shrink-0 items-center justify-center rounded-md bg-ink/5",
    {
      claude: "text-[#d97757]",
      codex: "text-ink",
      gemini: "text-[#4a8af4]",
      copilot: "text-ink",
      cursor: "text-ink",
      custom: "text-muted"
    }[kind]
  );

  switch (kind) {
    case "claude":
      return (
        <span aria-hidden="true" className={className}>
          <svg className={clsx("size-5")} viewBox="0 0 24 24" fill="currentColor">
            <path d="m4.7144 15.9555 4.7174-2.6471.079-.2307-.079-.1275h-.2307l-.7893-.0486-2.6956-.0729-2.3375-.0971-2.2646-.1214-.5707-.1215-.5343-.7042.0546-.3522.4797-.3218.686.0608 1.5179.1032 2.2767.1578 1.6514.0972 2.4468.255h.3886l.0546-.1579-.1336-.0971-.1032-.0972L6.973 9.8356l-2.55-1.6879-1.3356-.9714-.7225-.4918-.3643-.4614-.1578-1.0078.6557-.7225.8803.0607.2246.0607.8925.686 1.9064 1.4754 2.4893 1.8336.3643.3035.1457-.1032.0182-.0728-.164-.2733-1.3539-2.4467-1.445-2.4893-.6435-1.032-.17-.6194c-.0607-.255-.1032-.4674-.1032-.7285L6.287.1335 6.6997 0l.9957.1336.419.3642.6192 1.4147 1.0018 2.2282 1.5543 3.0296.4553.8985.2429.8318.091.255h.1579v-.1457l.1275-1.706.2368-2.0947.2307-2.6957.0789-.7589.3764-.9107.7468-.4918.5828.2793.4797.686-.0668.4433-.2853 1.8517-.5586 2.9021-.3643 1.9429h.2125l.2429-.2429.9835-1.3053 1.6514-2.0643.7286-.8196.85-.9046.5464-.4311h1.0321l.759 1.1293-.34 1.1657-1.0625 1.3478-.8804 1.1414-1.2628 1.7-.7893 1.36.0729.1093.1882-.0183 2.8535-.607 1.5421-.2794 1.8396-.3157.8318.3886.091.3946-.3278.8075-1.967.4857-2.3072.4614-3.4364.8136-.0425.0304.0486.0607 1.5482.1457.6618.0364h1.621l3.0175.2247.7892.522.4736.6376-.079.4857-1.2142.6193-1.6393-.3886-3.825-.9107-1.3113-.3279h-.1822v.1093l1.0929 1.0686 2.0035 1.8092 2.5075 2.3314.1275.5768-.3218.4554-.34-.0486-2.2039-1.6575-.85-.7468-1.9246-1.621h-.1275v.17l.4432.6496 2.3436 3.5214.1214 1.0807-.17.3521-.6071.2125-.6679-.1214-1.3721-1.9246L14.38 17.959l-1.1414-1.9428-.1397.079-.674 7.2552-.3156.3703-.7286.2793-.6071-.4614-.3218-.7468.3218-1.4753.3886-1.9246.3157-1.53.2853-1.9004.17-.6314-.0121-.0425-.1397.0182-1.4328 1.9672-2.1796 2.9446-1.7243 1.8456-.4128.164-.7164-.3704.0667-.6618.4008-.5889 2.386-3.0357 1.4389-1.882.929-1.0868-.0062-.1579h-.0546l-6.3385 4.1164-1.1293.1457-.4857-.4554.0608-.7467.2307-.2429 1.9064-1.3114Z" />
          </svg>
        </span>
      );
    case "codex":
      return (
        <span aria-hidden="true" className={className}>
          <svg className={clsx("size-5")} viewBox="0 0 721 721" fill="currentColor">
            <path d="M304.246 294.611V249.028C304.246 245.189 305.687 242.309 309.044 240.392L400.692 187.612C413.167 180.415 428.042 177.058 443.394 177.058C500.971 177.058 537.44 221.682 537.44 269.182C537.44 272.54 537.44 276.379 536.959 280.218L441.954 224.558C436.197 221.201 430.437 221.201 424.68 224.558L304.246 294.611ZM518.245 472.145V363.224C518.245 356.505 515.364 351.707 509.608 348.349L389.174 278.296L428.519 255.743C431.877 253.826 434.757 253.826 438.115 255.743L529.762 308.523C556.154 323.879 573.905 356.505 573.905 388.171C573.905 424.636 552.315 458.225 518.245 472.141V472.145ZM275.937 376.182L236.592 353.152C233.235 351.235 231.794 348.354 231.794 344.515V238.956C231.794 187.617 271.139 148.749 324.4 148.749C344.555 148.749 363.264 155.468 379.102 167.463L284.578 222.164C278.822 225.521 275.942 230.319 275.942 237.039V376.186L275.937 376.182ZM360.626 425.122L304.246 393.455V326.283L360.626 294.616L417.002 326.283V393.455L360.626 425.122ZM396.852 570.989C376.698 570.989 357.989 564.27 342.151 552.276L436.674 497.574C442.431 494.217 445.311 489.419 445.311 482.699V343.552L485.138 366.582C488.495 368.499 489.936 371.379 489.936 375.219V480.778C489.936 532.117 450.109 570.985 396.852 570.985V570.989ZM283.134 463.99L191.486 411.211C165.094 395.854 147.343 363.229 147.343 331.562C147.343 294.616 169.415 261.509 203.48 247.593V356.991C203.48 363.71 206.361 368.508 212.117 371.866L332.074 441.437L292.729 463.99C289.372 465.907 286.491 465.907 283.134 463.99ZM277.859 542.68C223.639 542.68 183.813 501.895 183.813 451.514C183.813 447.675 184.294 443.836 184.771 439.997L279.295 494.698C285.051 498.056 290.812 498.056 296.568 494.698L417.002 425.127V470.71C417.002 474.549 415.562 477.429 412.204 479.346L320.557 532.126C308.081 539.323 293.206 542.68 277.854 542.68H277.859ZM396.852 599.776C454.911 599.776 503.37 558.513 514.41 503.812C568.149 489.896 602.696 439.515 602.696 388.176C602.696 354.587 588.303 321.962 562.392 298.45C564.791 288.373 566.231 278.296 566.231 268.224C566.231 199.611 510.571 148.267 446.274 148.267C433.322 148.267 420.846 150.184 408.37 154.505C386.775 133.392 357.026 119.958 324.4 119.958C266.342 119.958 217.883 161.22 206.843 215.921C153.104 229.837 118.557 280.218 118.557 331.557C118.557 365.146 132.95 397.771 158.861 421.283C156.462 431.36 155.022 441.437 155.022 451.51C155.022 520.123 210.682 571.466 274.978 571.466C287.931 571.466 300.407 569.549 312.883 565.228C334.473 586.341 364.222 599.776 396.852 599.776Z" />
          </svg>
        </span>
      );
    case "gemini":
      return (
        <span aria-hidden="true" className={className}>
          <svg className={clsx("size-5")} viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81" />
          </svg>
        </span>
      );
    case "copilot":
      return (
        <span aria-hidden="true" className={className}>
          <svg className={clsx("size-5")} viewBox="0 0 24 24" fill="currentColor">
            <path d="M23.922 16.997C23.061 18.492 18.063 22.02 12 22.02 5.937 22.02.939 18.492.078 16.997A.641.641 0 0 1 0 16.741v-2.869a.883.883 0 0 1 .053-.22c.372-.935 1.347-2.292 2.605-2.656.167-.429.414-1.055.644-1.517a10.098 10.098 0 0 1-.052-1.086c0-1.331.282-2.499 1.132-3.368.397-.406.89-.717 1.474-.952C7.255 2.937 9.248 1.98 11.978 1.98c2.731 0 4.767.957 6.166 2.093.584.235 1.077.546 1.474.952.85.869 1.132 2.037 1.132 3.368 0 .368-.014.733-.052 1.086.23.462.477 1.088.644 1.517 1.258.364 2.233 1.721 2.605 2.656a.841.841 0 0 1 .053.22v2.869a.641.641 0 0 1-.078.256Zm-11.75-5.992h-.344a4.359 4.359 0 0 1-.355.508c-.77.947-1.918 1.492-3.508 1.492-1.725 0-2.989-.359-3.782-1.259a2.137 2.137 0 0 1-.085-.104L4 11.746v6.585c1.435.779 4.514 2.179 8 2.179 3.486 0 6.565-1.4 8-2.179v-6.585l-.098-.104s-.033.045-.085.104c-.793.9-2.057 1.259-3.782 1.259-1.59 0-2.738-.545-3.508-1.492a4.359 4.359 0 0 1-.355-.508Zm2.328 3.25c.549 0 1 .451 1 1v2c0 .549-.451 1-1 1-.549 0-1-.451-1-1v-2c0-.549.451-1 1-1Zm-5 0c.549 0 1 .451 1 1v2c0 .549-.451 1-1 1-.549 0-1-.451-1-1v-2c0-.549.451-1 1-1Zm3.313-6.185c.136 1.057.403 1.913.878 2.497.442.544 1.134.938 2.344.938 1.573 0 2.292-.337 2.657-.751.384-.435.558-1.15.558-2.361 0-1.14-.243-1.847-.705-2.319-.477-.488-1.319-.862-2.824-1.025-1.487-.161-2.192.138-2.533.529-.269.307-.437.808-.438 1.578v.021c0 .265.021.562.063.893Zm-1.626 0c.042-.331.063-.628.063-.894v-.02c-.001-.77-.169-1.271-.438-1.578-.341-.391-1.046-.69-2.533-.529-1.505.163-2.347.537-2.824 1.025-.462.472-.705 1.179-.705 2.319 0 1.211.175 1.926.558 2.361.365.414 1.084.751 2.657.751 1.21 0 1.902-.394 2.344-.938.475-.584.742-1.44.878-2.497Z" />
          </svg>
        </span>
      );
    case "cursor":
      return (
        <span aria-hidden="true" className={className}>
          <svg className={clsx("size-5")} viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23" />
          </svg>
        </span>
      );
    case "custom":
      return (
        <span aria-hidden="true" className={clsx(className, "font-mono text-sm")}>
          ›_
        </span>
      );
  }
}

export default function AgentPicker({
  open,
  onStart,
  onResume,
  onClose
}: Readonly<{
  open: boolean;
  onStart: (connectionId: number) => Promise<void>;
  onResume: () => void;
  onClose: () => void;
}>) {
  const [detected, setDetected] = useState<DetectedAgent[]>([]);
  const [connections, setConnections] = useState<AgentConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [custom, setCustom] = useState(false);
  const [name, setName] = useState("");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("[]");
  const [error, setError] = useState("");
  useResetOnOpen(open, () => {
    setBusy(false);
    setCustom(false);
    setName("");
    setCommand("");
    setArgs("[]");
  });

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([detectAgents(), getConnections()])
      .then(([agents, saved]) => {
        if (active) {
          setDetected(agents);
          setConnections(saved);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError("Couldn’t load agents. Try again.");
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [open, attempt]);

  async function start(id: number, complete: (callback: () => void) => void) {
    setBusy(true);
    setError("");
    try {
      await onStart(id);
      complete(onClose);
    } catch (error) {
      setError(errorMessage(error, "Couldn’t create this conversation. Try again."));
      setBusy(false);
    }
  }

  async function choose(kind: KnownAgent, complete: (callback: () => void) => void) {
    if (busy) return;
    const preset = presets.find((item) => item.value === kind)!;
    setBusy(true);
    setError("");
    try {
      let connection = connections.find((item) => item.kind === kind);
      if (!connection) {
        await createConnection({ name: preset.label, kind, command: preset.command, args: [] });
        const saved = await getConnections();
        setConnections(saved);
        connection = saved.find((item) => item.kind === kind);
      }
      if (!connection) throw new Error("Couldn’t find the saved agent. Try again.");
      await start(connection.id, complete);
    } catch (error) {
      setError(errorMessage(error, "Couldn’t save this agent. Try again."));
      setBusy(false);
    }
  }

  async function addCustom() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      let parsed: string[];
      try {
        parsed = parseArgs(args);
      } catch {
        throw new Error('Enter arguments as a JSON list of strings, for example ["--verbose"].');
      }
      await createConnection({ name, kind: "custom", command, args: parsed });
      setConnections(await getConnections());
      setCustom(false);
      setName("");
      setCommand("");
      setArgs("[]");
    } catch (error) {
      setError(errorMessage(error, "Couldn’t add this agent. Try again."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} title="Choose an agent" onClose={onClose} busy={busy}>
      {(_close, complete) => (
        <>
          <BodyText tone="muted">Pick which coding agent to start.</BodyText>
          <ul className={clsx("my-5 divide-y divide-ink/10")}>
            {presets.map((preset) => {
              const installed = detected.find((agent) => agent.kind === preset.value)?.installed;
              return (
                <li key={preset.value}>
                  <button
                    type="button"
                    disabled={busy || loading || !installed}
                    onClick={() => void choose(preset.value, complete)}
                    className={clsx(
                      "flex w-full items-center gap-3 rounded-md px-2 py-3 text-left text-sm",
                      "hover:bg-ink/5 disabled:text-muted disabled:hover:bg-transparent"
                    )}
                  >
                    <AgentIcon kind={preset.value} />
                    <span className={clsx("flex-1")}>{preset.label}</span>
                    <span className={clsx("text-xs text-muted")}>
                      {loading ? "Checking…" : installed ? <Chevron /> : "Not installed"}
                    </span>
                  </button>
                </li>
              );
            })}
            {connections
              .filter((connection) => connection.kind === "custom")
              .map((connection) => (
                <li key={connection.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void start(connection.id, complete)}
                    className={clsx(
                      "flex w-full items-center gap-3 rounded-md px-2 py-3 text-left text-sm",
                      "hover:bg-ink/5 disabled:opacity-50"
                    )}
                  >
                    <AgentIcon kind="custom" />
                    <span className={clsx("min-w-0 flex-1 truncate")}>{connection.name}</span>
                    <span className={clsx("flex items-center gap-1 text-xs text-muted")}>
                      Custom <Chevron />
                    </span>
                  </button>
                </li>
              ))}
          </ul>
          {error && (
            <BodyText role="alert" tone="error" className={clsx("mb-4")}>
              {error}
            </BodyText>
          )}
          <div
            className={clsx(
              "flex items-center justify-between gap-3 border-t border-ink/10 py-4 text-sm"
            )}
          >
            <button
              type="button"
              disabled={busy}
              onClick={() => complete(onResume)}
              className={clsx("rounded px-2 py-1 hover:bg-ink/5")}
            >
              Resume a session
            </button>
            <button
              type="button"
              disabled={busy || loading}
              onClick={() => setAttempt((value) => value + 1)}
              className={clsx("rounded px-2 py-1 text-muted hover:bg-ink/5")}
            >
              Check again
            </button>
          </div>
          {custom ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void addCustom();
              }}
            >
              <fieldset disabled={busy} className={clsx("space-y-4")}>
                <TextInput
                  label="Agent name"
                  autoFocus
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
                <TextInput
                  label="Invoke command"
                  required
                  value={command}
                  onChange={(event) => setCommand(event.target.value)}
                  hint="An executable name or full path. Put arguments in the field below."
                />
                <TextArea
                  label="Arguments"
                  value={args}
                  onChange={(event) => setArgs(event.target.value)}
                  hint={
                    'A JSON list, for example ["--verbose"]. Your message is appended as the final argument; shell operators are not interpreted.'
                  }
                />
                <BodyText tone="muted">
                  Custom agents receive only your current message. Session resume and Mneme tools
                  are not configured automatically.
                </BodyText>
                <div className={clsx("flex justify-end gap-3 text-sm")}>
                  <button
                    type="button"
                    onClick={() => setCustom(false)}
                    className={clsx("rounded-md border border-ink/15 px-3 py-2")}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={clsx("rounded-md bg-action px-3 py-2 text-on-action")}
                  >
                    Add agent
                  </button>
                </div>
              </fieldset>
            </form>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setCustom(true);
                setError("");
              }}
              className={clsx(
                "w-full rounded-md border border-dashed border-ink/25 px-4 py-3 text-sm",
                "hover:bg-ink/5"
              )}
            >
              Add custom agent
            </button>
          )}
        </>
      )}
    </Dialog>
  );
}
