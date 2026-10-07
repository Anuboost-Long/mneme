import {
  AgentPermission,
  agentPermissions,
  canAlwaysAllow,
  getTrustedPermissions,
  permissionDetails,
  setPermissionTrusted
} from "@/features/agent-server/lib/permissions";
import { BodyText, Caption, SectionTitle } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect, useState } from "react";

export default function AgentPermissions() {
  const [trusted, setTrusted] = useState<Set<AgentPermission>>(new Set());
  const [error, setError] = useState("");

  useEffect(() => {
    getTrustedPermissions().then(setTrusted, () =>
      setError("Couldn’t load permissions. Reopen Settings to try again.")
    );
  }, []);

  async function toggle(permission: AgentPermission, allowed: boolean) {
    setError("");
    try {
      await setPermissionTrusted(permission, allowed);
      setTrusted(await getTrustedPermissions());
    } catch {
      setError("Couldn’t save this permission. Try again.");
    }
  }

  return (
    <section
      aria-labelledby="agent-permissions-title"
      className={clsx("grid gap-6 border-t border-ink/10 py-6 @min-3xl:grid-cols-3")}
    >
      <div>
        <SectionTitle id="agent-permissions-title">Permissions</SectionTitle>
        <BodyText tone="muted" className={clsx("mt-2 max-w-xs")}>
          What an agent may do, and what it asks you first. Ask mode in Chat blocks every change.
        </BodyText>
      </div>
      <div className={clsx("min-w-0 w-full max-w-xl @min-3xl:col-span-2")}>
        <ul className={clsx("divide-y divide-ink/10 rounded-md border border-ink/15")}>
          {agentPermissions.map((permission) => {
            const { name, covers } = permissionDetails[permission];
            return (
              <li
                key={permission}
                className={clsx("flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3")}
              >
                <div className={clsx("min-w-0 flex-1 basis-56")}>
                  <p className={clsx("text-sm font-medium")}>{name}</p>
                  <Caption tone="muted">{covers}</Caption>
                </div>
                {canAlwaysAllow(permission) ? (
                  <label
                    className={clsx("flex shrink-0 cursor-pointer items-center gap-2 text-sm")}
                  >
                    <input
                      type="checkbox"
                      checked={trusted.has(permission)}
                      onChange={(event) => void toggle(permission, event.target.checked)}
                      className={clsx("accent-current")}
                    />
                    <span>Allow without asking</span>
                  </label>
                ) : (
                  <Caption tone="muted" className={clsx("shrink-0")}>
                    {permission === AgentPermission.Read ? "Always allowed" : "Always asks"}
                  </Caption>
                )}
              </li>
            );
          })}
        </ul>
        {error && (
          <BodyText role="alert" tone="error" className={clsx("mt-3")}>
            {error}
          </BodyText>
        )}
      </div>
    </section>
  );
}
