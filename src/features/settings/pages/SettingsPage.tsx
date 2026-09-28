import { useRef, useState } from "react";
import clsx from "clsx";
import { Link } from "react-router-dom";
import { useTheme } from "../../../shared/providers/ThemeProvider";
import { useSidebarMode, type SidebarMode } from "../../../shared/providers/SidebarModeProvider";
import { BodyText, Caption, PageTitle, SectionTitle, Typography } from "../../../shared/ui/Typography";
import { createBackup, downloadBackup, pickBackupFile, readBackupFile, restoreBackup } from "../../courses/lib/backup";
import { startAgentServer, stopAgentServer } from "../../agent-server/lib/agentServerState";
import { useAgentServer } from "../../agent-server/lib/useAgentServer";
import ChatRetention from "../../agent-chat/components/ChatRetention";
import ActionSettings from "../../ai-actions/components/ActionSettings";
import ProfileSettings from "../../ai-profiles/components/ProfileSettings";

const sidebarModes: { value: SidebarMode; label: string; hint: string }[] = [
  { value: "overlay", label: "Overlay", hint: "Floats over your content when open. Smoother animation, but covers what's underneath." },
  { value: "push", label: "Push", hint: "Shares space with your content when open, like before. Classic layout, heavier animation." },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { sidebarMode, setSidebarMode } = useSidebarMode();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [sidebarStatus, setSidebarStatus] = useState<"idle" | "saved" | "error">("idle");
  const [backupStatus, setBackupStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [restoreStatus, setRestoreStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [copied, setCopied] = useState(false);
  const restoreInput = useRef<HTMLInputElement>(null);
  const agentServer = useAgentServer();

  async function backUpNow() {
    setBackupStatus("busy");
    try {
      downloadBackup(await createBackup());
      setBackupStatus("done");
    } catch {
      setBackupStatus("error");
    }
  }

  async function restoreFromFile(file: File | undefined) {
    if (!file) return;
    setRestoreStatus("busy");
    try {
      await restoreBackup(await readBackupFile(file));
      window.location.reload();
    } catch {
      setRestoreStatus("error");
    }
  }

  async function chooseBackupFile() {
    try {
      await restoreFromFile(await pickBackupFile() ?? undefined);
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      if (code === "UNSUPPORTED") restoreInput.current?.click();
      // UNAVAILABLE: a picker is already open, which the user can see.
      else if (code !== "UNAVAILABLE") setRestoreStatus("error");
    }
  }

  async function copyAgentServerUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={clsx("@container w-full px-4 py-5 sm:px-6")}>
      <Link to="/" className={clsx("inline-flex items-center gap-2 rounded-md", "border border-ink/15", "px-3 py-2 text-sm font-medium", "hover:bg-ink/5")}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m12 5-7 7 7 7M5 12h14" /></svg>
        Back to home
      </Link>
      <PageTitle className={clsx("mt-6")}>Settings</PageTitle>
      <BodyText tone="muted" className={clsx("mt-2")}>Choose how Mneme looks on this device.</BodyText>
      <section aria-labelledby="appearance-title" className={clsx("mt-6 grid gap-6 border-t border-ink/10 py-6 @min-3xl:grid-cols-3")}>
        <div>
          <SectionTitle id="appearance-title">Appearance</SectionTitle>
          <BodyText tone="muted" className={clsx("mt-2 max-w-xs")}>Choose a light or dark workspace. Changes apply immediately.</BodyText>
        </div>
        <div className={clsx("min-w-0 w-full max-w-xl @min-3xl:col-span-2")}>
          <fieldset>
            <Typography as="legend" variant="label" className={clsx("mb-3")}>Colour theme</Typography>
            <div className={clsx("grid grid-cols-2 gap-4")}>
              {(["light", "dark"] as const).map((value) => (
                <label key={value} className={clsx("relative min-w-0 cursor-pointer rounded-lg", "border border-ink/15 bg-sidebar p-3", "hover:border-ink/35 has-checked:outline-2 has-checked:outline-ink has-focus-visible:outline-offset-4")}>
                  <div aria-hidden="true" className={clsx("flex h-28 overflow-hidden rounded border", value === "light" ? "border-chain-navy/15 bg-white" : "border-chain-cream/15 bg-chain-navy")}>
                    <div className={clsx("w-1/4 border-r", value === "light" ? "border-chain-navy/10 bg-chain-cream/40" : "border-chain-cream/10 bg-black/20")} />
                    <div className={clsx("flex-1 space-y-2 p-3")}>
                      <div className={clsx("h-2 w-2/3 rounded-sm", value === "light" ? "bg-chain-navy/50" : "bg-chain-cream/60")} />
                      <div className={clsx("h-1 w-full rounded-sm", value === "light" ? "bg-chain-navy/15" : "bg-chain-cream/20")} />
                      <div className={clsx("h-1 w-3/4 rounded-sm", value === "light" ? "bg-chain-navy/15" : "bg-chain-cream/20")} />
                    </div>
                  </div>
                  <div className={clsx("mt-3 flex items-center gap-2")}>
                    <input type="radio" name="theme" value={value} checked={theme === value} className={clsx("sr-only")} onChange={() => {
                      try { setTheme(value); setStatus("saved"); }
                      catch { setStatus("error"); }
                    }} />
                    <Typography as="span" variant="label">{value === "light" ? "Light" : "Dark"}</Typography>
                  </div>
                </label>
              ))}
            </div>
          </fieldset>
          <Caption tone="muted" className={clsx("mt-4")}>Your choice is saved on this device.</Caption>
          <div className={clsx("mt-3 min-h-6")}>
            {status === "saved" && <BodyText role="status" tone="muted">Appearance saved.</BodyText>}
            {status === "error" && <BodyText role="alert" tone="error">Couldn’t save your appearance. Your previous theme is still selected. Try choosing again.</BodyText>}
          </div>
        </div>
      </section>
      <section aria-labelledby="sidebar-title" className={clsx("grid gap-6 border-t border-ink/10 py-6 @min-3xl:grid-cols-3")}>
        <div>
          <SectionTitle id="sidebar-title">Sidebar</SectionTitle>
          <BodyText tone="muted" className={clsx("mt-2 max-w-xs")}>Choose how the sidebar opens. Changes apply immediately.</BodyText>
        </div>
        <div className={clsx("min-w-0 w-full max-w-xl @min-3xl:col-span-2")}>
          <fieldset>
            <Typography as="legend" variant="label" className={clsx("mb-3")}>Sidebar behaviour</Typography>
            <div className={clsx("grid grid-cols-2 gap-4")}>
              {sidebarModes.map((option) => (
                <label key={option.value} className={clsx("relative min-w-0 cursor-pointer rounded-lg", "border border-ink/15 bg-sidebar p-3", "hover:border-ink/35 has-checked:outline-2 has-checked:outline-ink has-focus-visible:outline-offset-4")}>
                  <div aria-hidden="true" className={clsx("relative flex h-28 overflow-hidden rounded border border-ink/10 bg-surface")}>
                    {option.value === "push" ? (
                      <>
                        <div className={clsx("w-1/3 border-r border-ink/10 bg-sidebar")} />
                        <div className={clsx("flex-1 space-y-2 p-3")}>
                          <div className={clsx("h-2 w-2/3 rounded-sm bg-ink/30")} />
                          <div className={clsx("h-1 w-full rounded-sm bg-ink/10")} />
                          <div className={clsx("h-1 w-3/4 rounded-sm bg-ink/10")} />
                        </div>
                      </>
                    ) : (
                      <>
                        <div className={clsx("flex-1 space-y-2 p-3 pl-8")}>
                          <div className={clsx("h-2 w-2/3 rounded-sm bg-ink/30")} />
                          <div className={clsx("h-1 w-full rounded-sm bg-ink/10")} />
                          <div className={clsx("h-1 w-3/4 rounded-sm bg-ink/10")} />
                        </div>
                        <div className={clsx("absolute inset-y-0 left-0 w-1/3 border-r border-ink/10 bg-sidebar shadow-md")} />
                      </>
                    )}
                  </div>
                  <div className={clsx("mt-3 flex items-center gap-2")}>
                    <input type="radio" name="sidebarMode" value={option.value} checked={sidebarMode === option.value} className={clsx("sr-only")} onChange={() => {
                      try { setSidebarMode(option.value); setSidebarStatus("saved"); }
                      catch { setSidebarStatus("error"); }
                    }} />
                    <Typography as="span" variant="label">{option.label}</Typography>
                  </div>
                  <BodyText tone="muted" className={clsx("mt-1 text-xs")}>{option.hint}</BodyText>
                </label>
              ))}
            </div>
          </fieldset>
          <Caption tone="muted" className={clsx("mt-4")}>Your choice is saved on this device.</Caption>
          <div className={clsx("mt-3 min-h-6")}>
            {sidebarStatus === "saved" && <BodyText role="status" tone="muted">Sidebar behaviour saved.</BodyText>}
            {sidebarStatus === "error" && <BodyText role="alert" tone="error">Couldn’t save your sidebar setting. Your previous choice is still selected. Try choosing again.</BodyText>}
          </div>
        </div>
      </section>
      <section aria-labelledby="data-title" className={clsx("grid gap-6 border-t border-ink/10 py-6 @min-3xl:grid-cols-3")}>
        <div>
          <SectionTitle id="data-title">Data</SectionTitle>
          <BodyText tone="muted" className={clsx("mt-2 max-w-xs")}>Back up your courses, modules and pages to a file, or restore an earlier backup.</BodyText>
        </div>
        <div className={clsx("min-w-0 w-full max-w-xl @min-3xl:col-span-2 space-y-6")}>
          <div>
            <Typography as="span" variant="label">Back up</Typography>
            <BodyText tone="muted" className={clsx("mt-1")}>Downloads everything as a single file you can keep or restore later.</BodyText>
            <button type="button" disabled={backupStatus === "busy"} onClick={backUpNow} className={clsx("mt-3 rounded-md border border-ink/15 px-4 py-2 text-sm font-medium", "hover:bg-ink/5")}>
              {backupStatus === "busy" ? "Preparing backup…" : "Download a backup"}
            </button>
            <div className={clsx("mt-2 min-h-6")}>
              {backupStatus === "done" && <BodyText role="status" tone="muted">Backup downloaded.</BodyText>}
              {backupStatus === "error" && <BodyText role="alert" tone="error">Couldn’t prepare a backup. Try again.</BodyText>}
            </div>
          </div>
          <div className={clsx("border-t border-ink/10 pt-6")}>
            <Typography as="span" variant="label">Restore</Typography>
            <BodyText tone="muted" className={clsx("mt-1")}>Adds courses, modules and pages from a backup file. Existing ones are left untouched.</BodyText>
            <button type="button" disabled={restoreStatus === "busy"} onClick={() => void chooseBackupFile()} className={clsx("mt-3 inline-flex items-center rounded-md", "border border-ink/20", "px-4 py-2 text-sm font-medium", "hover:bg-ink/5 focus-visible:outline-1 focus-visible:outline-offset-4 disabled:opacity-50")}>
              {restoreStatus === "busy" ? "Restoring…" : "Restore from a backup file"}
            </button>
            <input ref={restoreInput} type="file" accept="application/json,.json" hidden onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              restoreFromFile(file);
            }} />
            <div className={clsx("mt-2 min-h-6")}>
              {restoreStatus === "error" && <BodyText role="alert" tone="error">Couldn’t restore this file. Make sure it’s a Mneme backup and try again.</BodyText>}
            </div>
          </div>
        </div>
      </section>
      <section aria-labelledby="agent-tools-title" className={clsx("grid gap-6 border-t border-ink/10 py-6 @min-3xl:grid-cols-3")}>
        <div>
          <SectionTitle id="agent-tools-title">Agent Tools</SectionTitle>
          <BodyText tone="muted" className={clsx("mt-2 max-w-xs")}>Let an AI agent on this device — like Claude Code or Claude Desktop — read and edit your courses, modules and pages directly.</BodyText>
        </div>
        <div className={clsx("min-w-0 w-full max-w-xl @min-3xl:col-span-2")}>
          <Typography as="span" variant="label">Local agent server</Typography>
          <BodyText tone="muted" className={clsx("mt-1")}>Runs on this device only (127.0.0.1) — nothing is reachable over the network. An agent can list and read freely; the first time it creates or updates a page in a conversation, you'll get a popup to approve it before it happens. Deleting anything still always happens here in Mneme.</BodyText>
          <div className={clsx("mt-3 flex flex-wrap items-center gap-3")}>
            {agentServer.status === "running" ? (
              <button type="button" onClick={stopAgentServer} className={clsx("rounded-md border border-ink/15 px-4 py-2 text-sm font-medium", "hover:bg-ink/5")}>Stop</button>
            ) : (
              <button
                type="button" disabled={agentServer.status === "starting" || agentServer.status === "stopping"} onClick={startAgentServer}
                className={clsx("rounded-md border border-ink/15 px-4 py-2 text-sm font-medium", "hover:bg-ink/5", "disabled:cursor-not-allowed disabled:opacity-50")}
              >
                {agentServer.status === "starting" ? "Starting…" : agentServer.status === "stopping" ? "Stopping…" : "Start"}
              </button>
            )}
            {agentServer.status === "running" && agentServer.port !== null && (
              <button type="button" onClick={() => copyAgentServerUrl(`http://127.0.0.1:${agentServer.port}/mcp`)} className={clsx("rounded-md border border-ink/15 px-4 py-2 text-sm font-medium", "hover:bg-ink/5")}>
                {copied ? "Copied!" : `Copy URL (port ${agentServer.port})`}
              </button>
            )}
          </div>
          <div className={clsx("mt-2 min-h-6")}>
            {agentServer.status === "running" && <BodyText role="status" tone="muted">Running at http://127.0.0.1:{agentServer.port}/mcp — paste this into your AI agent’s MCP settings.</BodyText>}
            {agentServer.error && <BodyText role="alert" tone="error">{agentServer.error}</BodyText>}
          </div>
          <ChatRetention />
        </div>
      </section>
      <ProfileSettings />
      <ActionSettings />
    </div>
  );
}
