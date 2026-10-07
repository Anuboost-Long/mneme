import {
  deleteActionRow,
  insertAction,
  saveActionPositions,
  setActionEnabledColumn,
  updateActionColumns
} from "./table";
import { ActionScope, type ActionInput, type AiAction } from "./types";

export { getActions, getEnabledActions } from "./table";

function columns(input: ActionInput) {
  if (!input.name.trim()) throw new Error("Enter a name for the action.");
  if (!input.prompt.trim()) throw new Error("Enter the instructions for the action.");
  return {
    name: input.name.trim(),
    prompt: input.prompt.trim(),
    icon: input.icon,
    scope: input.scope,
    output: input.output,
    page_types:
      input.scope !== ActionScope.Page && input.pageTypes?.length
        ? JSON.stringify(input.pageTypes)
        : null
  };
}

export async function createAction(input: ActionInput) {
  await insertAction(columns(input));
}

export async function updateAction(id: number, input: ActionInput) {
  await updateActionColumns(id, columns(input));
}

export async function duplicateAction(action: AiAction) {
  await createAction({ ...action, name: `${action.name} (copy)` });
}

export async function setActionEnabled(id: number, enabled: boolean) {
  await setActionEnabledColumn(id, enabled);
}

export async function deleteAction(id: number) {
  await deleteActionRow(id);
}

export async function saveActionOrder(actions: AiAction[]) {
  await saveActionPositions(actions.map((action) => action.id));
}
