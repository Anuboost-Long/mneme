import { getSetting, putSetting } from "../../../shared/lib/settings/actions";

export enum AgentPermission {
  Read = 1,
  Create = 2,
  Edit = 3,
  Move = 4,
  Delete = 5,
  Internet = 6
}

export const agentPermissions: AgentPermission[] = [
  AgentPermission.Read,
  AgentPermission.Create,
  AgentPermission.Edit,
  AgentPermission.Move,
  AgentPermission.Delete,
  AgentPermission.Internet
];

export const permissionDetails: Record<AgentPermission, { name: string; covers: string; action?: string }> = {
  [AgentPermission.Read]: {
    name: "Read",
    covers: "Open, list and search your courses, modules and pages, with their pictures and transcripts. Never asks."
  },
  [AgentPermission.Create]: { name: "Create", covers: "Create pages and summaries.", action: "create pages" },
  [AgentPermission.Edit]: {
    name: "Edit",
    covers: "Add to pages and change their title, type or status. Replacing a page’s content always asks.",
    action: "edit pages"
  },
  [AgentPermission.Move]: { name: "Move", covers: "Move pages to another module.", action: "move pages" },
  [AgentPermission.Delete]: {
    name: "Delete",
    covers: "No agent tool deletes anything yet. When one does, it will always ask."
  },
  [AgentPermission.Internet]: { name: "Use the internet", covers: "No agent tool uses the internet yet." }
};

export const canAlwaysAllow = (permission: AgentPermission) => permissionDetails[permission].action !== undefined;

const trustedKey = "agent.trusted-permissions";

export async function getTrustedPermissions(): Promise<Set<AgentPermission>> {
  try {
    const saved: unknown = JSON.parse((await getSetting(trustedKey)) ?? "[]");
    return new Set(Array.isArray(saved) ? saved.filter(canAlwaysAllow) : []);
  } catch {
    return new Set();
  }
}

export async function setPermissionTrusted(permission: AgentPermission, trusted: boolean) {
  if (!canAlwaysAllow(permission)) return;
  const current = await getTrustedPermissions();
  if (trusted) current.add(permission);
  else current.delete(permission);
  await putSetting(trustedKey, JSON.stringify([...current].sort()));
}
