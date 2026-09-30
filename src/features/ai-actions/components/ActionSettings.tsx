import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import clsx from "clsx";
import Dialog from "../../../shared/ui/Dialog";
import { rowAction } from "../../../shared/ui/rowAction";
import { BodyText, Caption, SectionTitle } from "../../../shared/ui/Typography";
import { errorMessage } from "../../../shared/lib/errorMessage";
import { useDragReorder } from "../../../shared/lib/useDragReorder";
import DragHandle from "../../../shared/ui/DragHandle";
import { ActionOutput, ActionScope, deleteAction, duplicateAction, getActions, saveActionOrder, type AiAction } from "../lib/actions";
import ActionForm from "./ActionForm";
import ActionIcon from "./ActionIcon";

const scopeLabels: Record<ActionScope, string> = {
  [ActionScope.Page]: "Selection or page",
  [ActionScope.Module]: "Whole module",
  [ActionScope.Course]: "Whole course",
};

const outputLabels: Record<ActionOutput, string> = {
  [ActionOutput.Preview]: "Preview",
  [ActionOutput.InsertBelow]: "Insert below",
  [ActionOutput.NewPage]: "New page",
};

type DialogState = { kind: "create" } | { kind: "edit"; action: AiAction } | { kind: "delete"; action: AiAction } | null;

function DeleteAction({ action, onClose, onDelete }: Readonly<{ action: AiAction; onClose: () => void; onDelete: () => void }>) {
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
      {(close, complete) => <>
        <BodyText tone="muted" className={clsx("wrap-anywhere")}>“{action.name}” will be removed from the AI actions menu. Your pages aren’t affected.</BodyText>
        {error && <BodyText role="alert" tone="error" className={clsx("mt-4")}>{error}</BodyText>}
        <div className={clsx("mt-8 flex justify-end gap-3")}>
          <button type="button" disabled={busy} onClick={close} className={clsx("rounded-md border border-ink/15 px-4 py-2 text-sm", "hover:bg-ink/5")}>Cancel</button>
          <button type="button" disabled={busy} onClick={() => confirmDelete(complete)} className={clsx("rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white", "hover:bg-red-800")}>{busy ? "Deleting…" : "Delete action"}</button>
        </div>
      </>}
    </Dialog>
  );
}

export default function ActionSettings() {
  const section = useRef<HTMLElement>(null);
  const { hash } = useLocation();
  const [actions, setActions] = useState<AiAction[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);
  const reorderable = useDragReorder(actions, reorder);

  async function load() {
    try {
      setActions(await getActions());
    } catch (error) {
      setError(errorMessage(error, "Couldn’t load your AI actions. Try again."));
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => { void load(); }, []);

  function reorder(next: AiAction[]) {
    setActions(next);
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
    try {
      await operation();
      await load();
    } catch (error) {
      setError(errorMessage(error, failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section ref={section} id="ai-actions" aria-labelledby="ai-actions-title" className={clsx("grid gap-6 border-t border-ink/10 py-6 @min-3xl:grid-cols-3")}>
      <div>
        <SectionTitle id="ai-actions-title">AI actions</SectionTitle>
        <BodyText tone="muted" className={clsx("mt-2 max-w-xs")}>The actions in a page’s AI actions menu. Edit the defaults or add your own.</BodyText>
      </div>
      <div className={clsx("min-w-0 w-full max-w-xl @min-3xl:col-span-2")}>
        {!loaded && <BodyText role="status" tone="muted">Loading actions…</BodyText>}
        {loaded && actions.length === 0 && <BodyText tone="muted">No actions yet. Create one to add it to every page’s AI actions menu.</BodyText>}
        <ol className={clsx("relative m-0 grid list-none gap-2 p-0")}>
          {reorderable.items.map((action, index) => (
            <li key={action.id} ref={reorderable.itemRef(action.id)}
              className={clsx("flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-ink/10 bg-surface py-2 pr-2 pl-1", reorderable.draggingId === action.id && "relative z-10 border-ink/25 shadow-lg")}>
              <DragHandle name={action.name} {...reorderable.handleProps(action.id, index)} />
              <span className={clsx("flex min-w-0 flex-1 items-center gap-2")}>
                <ActionIcon icon={action.icon} />
                <span className={clsx("min-w-0")}>
                  <BodyText as="span" className={clsx("block truncate font-medium")}>{action.name}</BodyText>
                  <Caption as="span" tone="muted">{scopeLabels[action.scope]} · {outputLabels[action.output]}</Caption>
                </span>
              </span>
              <span className={clsx("flex shrink-0 items-center gap-1")}>
                <button type="button" disabled={busy} onClick={() => setDialog({ kind: "edit", action })} className={rowAction("edit")}>Edit</button>
                <button type="button" disabled={busy} onClick={() => change(() => duplicateAction(action), "Couldn’t duplicate the action. Try again.")} className={rowAction("create")}>Duplicate</button>
                <button type="button" disabled={busy} onClick={() => setDialog({ kind: "delete", action })} className={rowAction("danger")}>Delete</button>
              </span>
            </li>
          ))}
        </ol>
        <button type="button" disabled={busy} onClick={() => setDialog({ kind: "create" })} className={clsx("mt-4 rounded-md border border-ink/15 px-4 py-2 text-sm font-medium", "hover:bg-ink/5")}>New action</button>
        <div className={clsx("mt-2 min-h-6")}>
          {error && <BodyText role="alert" tone="error">{error}</BodyText>}
        </div>
      </div>
      {dialog?.kind === "create" && <ActionForm onClose={() => setDialog(null)} onSave={() => { setDialog(null); void load(); }} />}
      {dialog?.kind === "edit" && <ActionForm action={dialog.action} onClose={() => setDialog(null)} onSave={() => { setDialog(null); void load(); }} />}
      {dialog?.kind === "delete" && <DeleteAction action={dialog.action} onClose={() => setDialog(null)} onDelete={() => { setDialog(null); void load(); }} />}
    </section>
  );
}
