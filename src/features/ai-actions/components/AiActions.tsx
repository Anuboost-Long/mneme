import type { Editor } from "@tiptap/react";
import clsx from "clsx";
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { addCommandSource } from "../../../shared/lib/commandSources";
import { getActionConnection, getActions } from "../lib/action/actions";
import { ActionScope } from "../lib/action/types";
import { useAiAction, type ActionLocation } from "../lib/useAiAction";
import AiActionResult from "./AiActionResult";
import AiActionsMenu from "./AiActionsMenu";

const wideScopes: Partial<Record<ActionScope, string>> = {
  [ActionScope.Module]: "Whole module",
  [ActionScope.Course]: "Whole course"
};

// Sticky so the menu stays reachable after scrolling down to select text
// deep in a long page; the wrapper ignores pointer events so it never
// blocks clicks on the content scrolling underneath it.
export default function AiActions({
  editor,
  location,
  onChangeProfile
}: Readonly<{
  editor: Editor;
  location: ActionLocation;
  onChangeProfile: (id: number | null) => Promise<void>;
}>) {
  const {
    run,
    start,
    stop,
    discard,
    insertBelow,
    addSection,
    replaceSelection,
    saveAsPage,
    undoNotice,
    undo,
    dismissUndo
  } = useAiAction(editor, location);

  // Nothing to offer until an agent is chosen to run actions with.
  async function availableActions() {
    const [actions, connection] = await Promise.all([getActions(), getActionConnection()]);
    return connection ? actions.map((action) => ({ action, connection })) : [];
  }

  useEffect(
    () =>
      addCommandSource({
        group: "AI actions",
        load: async () => {
          const target = editor.state.selection.empty ? "Whole page" : "Selected text";
          return (await availableActions()).map(({ action, connection }) => ({
            id: `ai-action-${action.id}`,
            label: action.name,
            detail: `${wideScopes[action.scope] ?? target} · ${connection.name}`,
            run: () => void start(connection, action)
          }));
        }
      }),
    [editor, start]
  );

  // The same actions in the `/` menu. Typed on an empty line, so a page
  // action runs on the whole page.
  useEffect(() => {
    editor.storage.slashCommands.loadAiItems = async () =>
      (await availableActions()).map(({ action, connection }) => ({
        id: `ai-action-${action.id}`,
        label: action.name,
        hint: `${wideScopes[action.scope] ?? "Whole page"} · ${connection.name}`,
        category: "AI" as const,
        keywords: ["ai", "ask", "agent"],
        run: () => void start(connection, action)
      }));
    return () => {
      editor.storage.slashCommands.loadAiItems = null;
    };
  }, [editor, start]);

  // Home's quick actions open a page with the action to run in the route
  // state; it's cleared first so going back doesn't run it again.
  const routeState = useLocation().state as { runActionId?: number } | null;
  const navigate = useNavigate();
  useEffect(() => {
    const id = routeState?.runActionId;
    if (!id) return;
    navigate(".", { replace: true, state: null });
    void availableActions().then((available) => {
      const found = available.find(({ action }) => action.id === id);
      if (found) void start(found.connection, found.action);
    });
  }, [routeState]);

  return (
    <>
      <div className={clsx("pointer-events-none sticky top-3 z-20 mb-2 flex justify-end")}>
        <div className={clsx("pointer-events-auto")}>
          <AiActionsMenu
            editor={editor}
            course={{ profileId: location.aiProfileId, onChange: onChangeProfile }}
            onRun={(connection, action) => void start(connection, action)}
          />
        </div>
      </div>
      {run && (
        <AiActionResult
          run={run}
          onStop={stop}
          onInsert={insertBelow}
          onAddSection={addSection}
          onReplace={replaceSelection}
          onSaveAsPage={() => void saveAsPage()}
          onDiscard={discard}
        />
      )}
      {!run && undoNotice && (
        <div
          role="status"
          className={clsx(
            "fixed right-4 bottom-20 z-40 flex items-center gap-3",
            "rounded-lg border border-ink/20 bg-surface shadow-lg",
            "py-2 pr-2 pl-4 text-sm"
          )}
        >
          <span>{undoNotice}</span>
          <button
            type="button"
            onClick={undo}
            className={clsx("rounded-md px-3 py-1.5 font-medium", "hover:bg-ink/5")}
          >
            Undo
          </button>
          <button
            type="button"
            onClick={dismissUndo}
            aria-label="Dismiss"
            className={clsx("size-8 rounded-md text-lg text-muted", "hover:bg-ink/5")}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
