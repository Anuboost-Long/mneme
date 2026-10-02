import type { Editor } from "@tiptap/react";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { errorMessage } from "../../../shared/lib/errorMessage";
import Select from "../../../shared/ui/Select";
import { BodyText, Caption } from "../../../shared/ui/Typography";
import { getConnections } from "../../agent-chat/lib/connection/actions";
import type { AgentConnection } from "../../agent-chat/lib/connection/types";
import ProfilePicker, { type CourseProfile } from "../../ai-profiles/components/ProfilePicker";
import { getActionConnectionId, getActions, setActionConnectionId } from "../lib/action/actions";
import { ActionScope, type AiAction } from "../lib/action/types";
import ActionIcon from "./ActionIcon";

const scopeTags: Partial<Record<ActionScope, string>> = {
  [ActionScope.Module]: "Module",
  [ActionScope.Course]: "Course"
};

export default function AiActionsMenu({
  editor,
  course,
  onRun
}: Readonly<{
  editor: Editor;
  course: CourseProfile;
  onRun: (connection: AgentConnection, action: AiAction) => void;
}>) {
  const root = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [onSelection, setOnSelection] = useState(false);
  const [actions, setActions] = useState<AiAction[]>([]);
  const [connections, setConnections] = useState<AgentConnection[]>([]);
  const [connectionId, setConnectionId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    function dismissOnOutside(event: PointerEvent) {
      if (event.target instanceof Node && root.current?.contains(event.target)) return;
      setOpen(false);
    }
    function dismissOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", dismissOnOutside);
    document.addEventListener("keydown", dismissOnEscape);
    return () => {
      document.removeEventListener("pointerdown", dismissOnOutside);
      document.removeEventListener("keydown", dismissOnEscape);
    };
  }, [open]);

  // Reloaded on every open, so an agent added in Agent chat meanwhile shows up.
  async function openMenu() {
    setOnSelection(!editor.state.selection.empty);
    setOpen(true);
    setError("");
    try {
      const [loadedActions, loadedConnections, savedId] = await Promise.all([
        getActions(),
        getConnections(),
        getActionConnectionId()
      ]);
      setActions(loadedActions);
      setConnections(loadedConnections);
      setConnectionId(
        loadedConnections.some((connection) => connection.id === savedId)
          ? savedId
          : (loadedConnections[0]?.id ?? null)
      );
    } catch (error) {
      setError(errorMessage(error, "Couldn’t load AI actions. Try again."));
    } finally {
      setLoaded(true);
    }
  }

  function chooseConnection(id: number) {
    setConnectionId(id);
    setActionConnectionId(id).catch(() => {});
  }

  function runAction(action: AiAction) {
    const connection = connections.find((item) => item.id === connectionId);
    if (!connection) return;
    setOpen(false);
    onRun(connection, action);
  }

  return (
    <div ref={root} className={clsx("relative")}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : void openMenu())}
        className={clsx(
          "inline-flex items-center gap-2 rounded-md",
          "border border-ink/15 bg-surface shadow-sm",
          "px-3 py-1.5 text-sm font-medium",
          "hover:bg-sidebar"
        )}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.1 2.1M15.6 15.6l2.1 2.1M6.3 17.7l2.1-2.1M15.6 8.4l2.1-2.1" />
        </svg>
        AI actions
      </button>
      {open && (
        <div
          className={clsx(
            "absolute top-full right-0 z-30 mt-2 w-72",
            "rounded-lg border border-ink/20 bg-surface shadow-lg",
            "p-1 text-sm text-ink"
          )}
        >
          <Caption as="p" tone="muted" className={clsx("px-3 pt-2 pb-1")}>
            {onSelection ? "On the selected text" : "On the whole page"}
          </Caption>
          {error && (
            <BodyText role="alert" tone="error" className={clsx("px-3 py-2")}>
              {error}
            </BodyText>
          )}
          {!loaded && (
            <BodyText role="status" tone="muted" className={clsx("px-3 py-2")}>
              Loading actions…
            </BodyText>
          )}
          {loaded && (
            <div className={clsx("mb-1 space-y-3 border-b border-ink/10 px-2 pt-1 pb-3")}>
              {connectionId === null ? (
                <BodyText tone="muted">
                  No agent connected yet.{" "}
                  <Link to="/agent-chat" className={clsx("text-ink underline underline-offset-4")}>
                    Add one in Agent chat
                  </Link>{" "}
                  to run actions.
                </BodyText>
              ) : (
                <Select
                  label="Run with"
                  value={connectionId}
                  onChange={chooseConnection}
                  options={connections.map((connection) => ({
                    value: connection.id,
                    label: connection.name
                  }))}
                />
              )}
              <ProfilePicker course={course} />
            </div>
          )}
          <ul className={clsx("m-0 max-h-80 list-none overflow-y-auto p-0")}>
            {actions.map((action) => (
              <li key={action.id}>
                <button
                  type="button"
                  disabled={connectionId === null}
                  onClick={() => runAction(action)}
                  className={clsx(
                    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left",
                    "hover:bg-ink/7",
                    "disabled:text-muted disabled:hover:bg-transparent"
                  )}
                >
                  <ActionIcon icon={action.icon} />
                  <span className={clsx("min-w-0 flex-1 truncate")}>{action.name}</span>
                  {scopeTags[action.scope] && (
                    <Caption as="span" tone="muted">
                      {scopeTags[action.scope]}
                    </Caption>
                  )}
                </button>
              </li>
            ))}
          </ul>
          {loaded && (
            <div className={clsx("mt-1 border-t border-ink/10 px-2 pt-2 pb-2")}>
              <Link
                to="/settings/ai#ai-actions"
                className={clsx(
                  "inline-block text-sm text-muted underline underline-offset-4",
                  "hover:text-ink"
                )}
              >
                Manage actions
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
