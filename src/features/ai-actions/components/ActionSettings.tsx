import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { errorMessage } from "../../../shared/lib/errorMessage";
import { pickFiles } from "../../../shared/lib/pickFiles";
import { claimSetting } from "../../../shared/lib/settings/actions";
import { useDragReorder } from "../../../shared/lib/useDragReorder";
import ConfirmDeleteDialog from "../../../shared/ui/ConfirmDeleteDialog";
import Dialog from "../../../shared/ui/Dialog";
import Tour, { type TourStep } from "../../../shared/ui/Tour";
import DragHandle from "../../../shared/ui/DragHandle";
import { rowAction } from "../../../shared/ui/rowAction";
import { BodyText, Caption, SectionTitle } from "../../../shared/ui/Typography";
import {
  deleteAction,
  duplicateAction,
  getActions,
  saveActionOrder,
  setActionEnabled
} from "../lib/action/actions";
import { ActionOutput, ActionScope, type AiAction } from "../lib/action/types";
import {
  exportPack,
  exportStandaloneActions,
  getPacks,
  installPack,
  readPackFile,
  removePack
} from "../lib/pack/actions";
import type { ActionPack, PackContent } from "../lib/pack/types";
import ActionForm from "./ActionForm";
import ActionIcon from "./ActionIcon";
import PackBrowser, { PackActionList } from "./PackBrowser";

const scopeLabels: Record<ActionScope, string> = {
  [ActionScope.Page]: "Selection or page",
  [ActionScope.Module]: "Whole module",
  [ActionScope.Course]: "Whole course"
};

const outputLabels: Record<ActionOutput, string> = {
  [ActionOutput.Preview]: "Preview",
  [ActionOutput.InsertBelow]: "Insert below",
  [ActionOutput.NewPage]: "New page"
};

const tourSteps: TourStep[] = [
  {
    target: "browse-packs",
    title: "Add actions for your subject",
    body: "Choose Browse packs, pick your subject, and select Install. A pack adds ready-made AI actions, like Solve step by step for maths or Case brief for law."
  },
  {
    target: "installed-pack",
    title: "Your installed packs",
    body: "Each pack you install appears here. On a page, its actions show as their own group in the AI actions menu."
  },
  {
    target: "action-switch",
    title: "Hide what you don’t use",
    body: "Untick an action to hide it from the AI actions menu. It stays here, so you can tick it again later."
  },
  {
    target: "export-actions",
    title: "Share your actions",
    body: "Export my actions, or Export next to a pack, saves a .mneme-pack.json file. Send it to classmates so they get the same actions."
  },
  {
    target: "import-pack",
    title: "Use a pack someone shared",
    body: "Choose Import pack, then pick the .mneme-pack.json file you received. You’ll see its actions before anything is added."
  },
  {
    target: "show-tour",
    title: "Watch this again",
    body: "Choose Show me how any time to replay this tour."
  }
];

type DialogState =
  | { kind: "create" }
  | { kind: "edit"; action: AiAction }
  | { kind: "delete"; action: AiAction }
  | { kind: "browse" }
  | { kind: "import" }
  | { kind: "remove"; pack: ActionPack; count: number }
  | null;

function DeleteAction({
  action,
  onClose,
  onDelete
}: Readonly<{ action: AiAction; onClose: () => void; onDelete: () => void }>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirmDelete(complete: (callback: () => void) => void) {
    setBusy(true);
    try {
      await deleteAction(action.id);
      complete(onDelete);
    } catch {
      setError("Couldn’t delete the action. Try again.");
      setBusy(false);
    }
  }

  return (
    <Dialog title="Delete action?" busy={busy} onClose={onClose}>
      {(close, complete) => (
        <>
          <BodyText tone="muted" className={clsx("wrap-anywhere")}>
            “{action.name}” will be removed from the AI actions menu. Your pages aren’t affected.
          </BodyText>
          {error && (
            <BodyText role="alert" tone="error" className={clsx("mt-4")}>
              {error}
            </BodyText>
          )}
          <div className={clsx("mt-8 flex justify-end gap-3")}>
            <button
              type="button"
              disabled={busy}
              onClick={close}
              className={clsx(
                "rounded-md border border-ink/15 px-4 py-2 text-sm",
                "hover:bg-ink/5"
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => confirmDelete(complete)}
              className={clsx(
                "rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white",
                "hover:bg-red-800"
              )}
            >
              {busy ? "Deleting…" : "Delete action"}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}

function ImportPack({
  onClose,
  onInstall
}: Readonly<{
  onClose: () => void;
  onInstall: () => void;
}>) {
  const [pack, setPack] = useState<PackContent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function chooseFile() {
    setError("");
    try {
      const [file] = await pickFiles({ extensions: ["json"] });
      if (file) setPack(readPackFile(await file.text()));
    } catch (error) {
      setError(errorMessage(error, "Couldn’t open the file. Try again."));
    }
  }

  let confirmLabel = "Choose file";
  if (pack) confirmLabel = busy ? "Installing…" : "Install pack";

  async function install(pack: PackContent, complete: (callback: () => void) => void) {
    setBusy(true);
    try {
      await installPack(pack);
      complete(onInstall);
    } catch (error) {
      setError(errorMessage(error, "Couldn’t install the pack. Try again."));
      setBusy(false);
    }
  }

  return (
    <Dialog title={pack ? `Install “${pack.name}”?` : "Import pack"} busy={busy} onClose={onClose}>
      {(close, complete) => (
        <>
          {pack ? (
            <>
              {pack.description && (
                <BodyText tone="muted" className={clsx("mb-4 wrap-anywhere")}>
                  {pack.description}
                </BodyText>
              )}
              <Caption tone="muted" className={clsx("mb-3")}>
                These {pack.actions.length} actions will be added to the AI actions menu, in their
                own group:
              </Caption>
              <PackActionList actions={pack.actions} />
            </>
          ) : (
            <div className={clsx("space-y-3")}>
              <BodyText tone="muted">
                A pack file holds a set of AI actions someone has shared. It ends in{" "}
                <code className={clsx("text-ink")}>.mneme-pack.json</code>.
              </BodyText>
              <ol className={clsx("m-0 list-decimal space-y-1 pl-5 text-sm text-muted")}>
                <li>
                  To make one, choose <span className={clsx("text-ink")}>Export</span> next to a
                  pack, or <span className={clsx("text-ink")}>Export my actions</span>, and send the
                  saved file to someone.
                </li>
                <li>
                  To use one you’ve received, choose the file below. You’ll see its actions before
                  anything is added.
                </li>
                <li>
                  Once installed, its actions appear as their own group in every page’s AI actions
                  menu. You can edit, turn off or remove them here.
                </li>
              </ol>
            </div>
          )}
          {error && (
            <BodyText role="alert" tone="error" className={clsx("mt-4")}>
              {error}
            </BodyText>
          )}
          <div className={clsx("mt-8 flex justify-end gap-3")}>
            <button
              type="button"
              disabled={busy}
              onClick={close}
              className={clsx(
                "rounded-md border border-ink/15 px-4 py-2 text-sm",
                "hover:bg-ink/5"
              )}
            >
              Cancel
            </button>
            {pack && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void chooseFile()}
                className={clsx(
                  "rounded-md border border-ink/15 px-4 py-2 text-sm",
                  "hover:bg-ink/5"
                )}
              >
                Choose another file
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void (pack ? install(pack, complete) : chooseFile())}
              className={clsx(
                "rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action",
                "hover:bg-action/85"
              )}
            >
              {confirmLabel}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}

function ActionRows({
  actions,
  busy,
  onReorder,
  onToggle,
  onEdit,
  onDuplicate,
  onDelete
}: Readonly<{
  actions: AiAction[];
  busy: boolean;
  onReorder: (next: AiAction[]) => void;
  onToggle: (action: AiAction) => void;
  onEdit: (action: AiAction) => void;
  onDuplicate: (action: AiAction) => void;
  onDelete: (action: AiAction) => void;
}>) {
  const reorderable = useDragReorder(actions, onReorder);
  return (
    <ol className={clsx("relative m-0 grid list-none gap-2 p-0")}>
      {reorderable.items.map((action, index) => (
        <li
          key={action.id}
          ref={reorderable.itemRef(action.id)}
          className={clsx(
            "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-ink/10 bg-surface py-2 pr-2 pl-1",
            reorderable.draggingId === action.id && "relative z-10 border-ink/25 shadow-lg"
          )}
        >
          <DragHandle name={action.name} {...reorderable.handleProps(action.id, index)} />
          <input
            type="checkbox"
            data-tour="action-switch"
            checked={action.enabled}
            disabled={busy}
            onChange={() => onToggle(action)}
            aria-label={`Show “${action.name}” in the AI actions menu`}
            className={clsx("size-4 shrink-0 accent-current")}
          />
          <span
            className={clsx(
              "flex min-w-0 flex-1 items-center gap-2",
              !action.enabled && "text-muted"
            )}
          >
            <ActionIcon icon={action.icon} />
            <span className={clsx("min-w-0")}>
              <BodyText as="span" tone="inherit" className={clsx("block truncate font-medium")}>
                {action.name}
              </BodyText>
              <Caption as="span" tone="muted">
                {scopeLabels[action.scope]} · {outputLabels[action.output]}
                {!action.enabled && " · Hidden from menu"}
              </Caption>
            </span>
          </span>
          <span className={clsx("flex shrink-0 items-center gap-1")}>
            <button
              type="button"
              disabled={busy}
              onClick={() => onEdit(action)}
              className={rowAction("edit")}
            >
              Edit
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDuplicate(action)}
              className={rowAction("create")}
            >
              Duplicate
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDelete(action)}
              className={rowAction("danger")}
            >
              Delete
            </button>
          </span>
        </li>
      ))}
    </ol>
  );
}

export default function ActionSettings() {
  const section = useRef<HTMLElement>(null);
  const { hash } = useLocation();
  const [actions, setActions] = useState<AiAction[]>([]);
  const [packs, setPacks] = useState<ActionPack[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const [touring, setTouring] = useState(false);

  async function load() {
    try {
      const [loadedActions, loadedPacks] = await Promise.all([getActions(), getPacks()]);
      setActions(loadedActions);
      setPacks(loadedPacks);
    } catch (error) {
      setError(errorMessage(error, "Couldn’t load your AI actions. Try again."));
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    claimSetting("tour.ai-actions", "seen")
      .then((firstVisit) => setTouring(firstVisit))
      .catch(() => {});
  }, [loaded]);

  function reorder(next: AiAction[]) {
    const moved = new Set(next.map((action) => action.id));
    setActions((current) => [...current.filter((action) => !moved.has(action.id)), ...next]);
    setError("");
    saveActionOrder(next).catch((error) => {
      setError(errorMessage(error, "Couldn’t save the new order. Try again."));
      void load();
    });
  }

  // The AI actions menu's "Manage actions" link lands here.
  useEffect(() => {
    if (hash === "#ai-actions" && loaded) section.current?.scrollIntoView({ block: "start" });
  }, [hash, loaded]);

  async function change(operation: () => Promise<void>, failure: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await operation();
      await load();
    } catch (error) {
      setError(errorMessage(error, failure));
    } finally {
      setBusy(false);
    }
  }

  async function saveExport(task: () => Promise<string | null>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const name = await task();
      if (name) setNotice(`Saved as ${name}.`);
    } catch (error) {
      if ((error as { code?: string } | null)?.code !== "UNAVAILABLE")
        setError(errorMessage(error, "Couldn’t save the file. Try again."));
    } finally {
      setBusy(false);
    }
  }

  const rowHandlers = {
    busy,
    onReorder: reorder,
    onToggle: (action: AiAction) =>
      change(
        () => setActionEnabled(action.id, !action.enabled),
        "Couldn’t change the action. Try again."
      ),
    onEdit: (action: AiAction) => setDialog({ kind: "edit", action }),
    onDuplicate: (action: AiAction) =>
      change(() => duplicateAction(action), "Couldn’t duplicate the action. Try again."),
    onDelete: (action: AiAction) => setDialog({ kind: "delete", action })
  };

  function closeAndReload() {
    setDialog(null);
    void load();
  }

  return (
    <section
      ref={section}
      id="ai-actions"
      aria-labelledby="ai-actions-title"
      className={clsx("grid gap-6 border-t border-ink/10 py-6 @min-3xl:grid-cols-3")}
    >
      <div>
        <SectionTitle id="ai-actions-title">AI actions</SectionTitle>
        <BodyText tone="muted" className={clsx("mt-2 max-w-xs")}>
          The actions in a page’s AI actions menu. Edit the defaults, add your own, or install a
          pack for your subject.
        </BodyText>
        <button
          type="button"
          data-tour="show-tour"
          disabled={!loaded}
          onClick={() => setTouring(true)}
          className={clsx("mt-3 text-sm text-muted underline underline-offset-4", "hover:text-ink")}
        >
          Show me how
        </button>
      </div>
      <div className={clsx("min-w-0 w-full max-w-xl @min-3xl:col-span-2")}>
        {!loaded && (
          <BodyText role="status" tone="muted">
            Loading actions…
          </BodyText>
        )}
        {loaded && actions.length === 0 && (
          <BodyText tone="muted">
            No actions yet. Create one to add it to every page’s AI actions menu.
          </BodyText>
        )}
        <ActionRows actions={actions.filter((action) => action.packId === null)} {...rowHandlers} />
        <div className={clsx("mt-4 flex flex-wrap gap-2")}>
          <button
            type="button"
            disabled={busy}
            onClick={() => setDialog({ kind: "create" })}
            className={clsx(
              "rounded-md border border-ink/15 px-4 py-2 text-sm font-medium",
              "hover:bg-ink/5"
            )}
          >
            New action
          </button>
          <button
            type="button"
            disabled={busy}
            data-tour="browse-packs"
            onClick={() => setDialog({ kind: "browse" })}
            className={clsx("rounded-md border border-ink/15 px-4 py-2 text-sm", "hover:bg-ink/5")}
          >
            Browse packs
          </button>
          <button
            type="button"
            disabled={busy}
            data-tour="import-pack"
            onClick={() => setDialog({ kind: "import" })}
            className={clsx("rounded-md border border-ink/15 px-4 py-2 text-sm", "hover:bg-ink/5")}
          >
            Import pack
          </button>
          <button
            type="button"
            disabled={busy}
            data-tour="export-actions"
            onClick={() => void saveExport(exportStandaloneActions)}
            className={clsx("rounded-md border border-ink/15 px-4 py-2 text-sm", "hover:bg-ink/5")}
          >
            Export my actions
          </button>
        </div>
        <div className={clsx("mt-2 min-h-6")}>
          {error && (
            <BodyText role="alert" tone="error">
              {error}
            </BodyText>
          )}
          {notice && (
            <BodyText role="status" tone="muted">
              {notice}
            </BodyText>
          )}
        </div>
        {packs.map((pack) => {
          const packActions = actions.filter((action) => action.packId === pack.id);
          return (
            <section
              key={pack.id}
              aria-label={pack.name}
              className={clsx("mt-6 border-t border-ink/10 pt-6")}
            >
              <div
                data-tour="installed-pack"
                className={clsx("mb-3 flex flex-wrap items-start justify-between gap-2")}
              >
                <div className={clsx("min-w-0")}>
                  <BodyText as="h3" className={clsx("font-medium wrap-anywhere")}>
                    {pack.name}
                  </BodyText>
                  {pack.description && (
                    <Caption tone="muted" className={clsx("wrap-anywhere")}>
                      {pack.description}
                    </Caption>
                  )}
                </div>
                <span className={clsx("flex shrink-0 items-center gap-1")}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void saveExport(() => exportPack(pack))}
                    className={rowAction()}
                  >
                    Export
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      setDialog({
                        kind: "remove",
                        pack,
                        count: packActions.length
                      })
                    }
                    className={rowAction("danger")}
                  >
                    Remove pack
                  </button>
                </span>
              </div>
              <ActionRows actions={packActions} {...rowHandlers} />
            </section>
          );
        })}
      </div>
      {dialog?.kind === "create" && (
        <ActionForm onClose={() => setDialog(null)} onSave={closeAndReload} />
      )}
      {dialog?.kind === "edit" && (
        <ActionForm
          action={dialog.action}
          onClose={() => setDialog(null)}
          onSave={closeAndReload}
        />
      )}
      {dialog?.kind === "delete" && (
        <DeleteAction
          action={dialog.action}
          onClose={() => setDialog(null)}
          onDelete={closeAndReload}
        />
      )}
      {dialog?.kind === "browse" && (
        <PackBrowser
          installedKeys={
            new Set(packs.flatMap((pack) => (pack.catalogKey ? [pack.catalogKey] : [])))
          }
          onInstalled={() => void load()}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "import" && (
        <ImportPack onClose={() => setDialog(null)} onInstall={closeAndReload} />
      )}
      {touring && <Tour steps={tourSteps} onClose={() => setTouring(false)} />}
      {dialog?.kind === "remove" && (
        <ConfirmDeleteDialog
          title="Remove pack?"
          message={`“${dialog.pack.name}” and its ${dialog.count} actions will be removed from the AI actions menu. Your pages aren’t affected.`}
          confirmLabel="Remove pack"
          failure="Couldn’t remove the pack. Try again."
          onConfirm={() => removePack(dialog.pack.id)}
          onClose={() => setDialog(null)}
          onDeleted={closeAndReload}
        />
      )}
    </section>
  );
}
