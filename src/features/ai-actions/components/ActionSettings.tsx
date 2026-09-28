import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { useLocation } from "react-router-dom";
import clsx from "clsx";
import Dialog from "../../../shared/ui/Dialog";
import { rowAction } from "../../../shared/ui/rowAction";
import { BodyText, Caption, SectionTitle } from "../../../shared/ui/Typography";
import { errorMessage } from "../../../shared/lib/errorMessage";
import { ActionOutput, ActionScope, deleteAction, duplicateAction, getActions, saveActionOrder, type AiAction } from "../lib/actions";
import ActionForm from "./ActionForm";
import ActionIcon from "./ActionIcon";

const scopeLabels: Record<ActionScope, string> = {
  [ActionScope.Page]: "Selection or page",
  [ActionScope.Module]: "Whole module",
  [ActionScope.Course]: "Whole course",
};

const reorderAnimation: KeyframeAnimationOptions = { duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)" };

const dragThresholdPx = 4;

type Drag = { id: number; startY: number; lastY: number; startTop: number; saved: AiAction[]; active: boolean; detach: () => void };

function setDragCursor(on: boolean) {
  document.body.style.cursor = on ? "grabbing" : "";
  document.body.style.userSelect = on ? "none" : "";
}

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
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const drag = useRef<Drag | null>(null);
  const cards = useRef(new Map<number, HTMLLIElement>());
  const cardTops = useRef(new Map<number, number>());
  const order = useRef<AiAction[]>([]);

  useLayoutEffect(() => {
    order.current = actions;
    const animate = !matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const [id, card] of cards.current) {
      const top = card.offsetTop;
      const previous = cardTops.current.get(id);
      cardTops.current.set(id, top);
      if (drag.current?.active && drag.current.id === id) followPointer();
      else if (animate && previous !== undefined && previous !== top) {
        card.animate([{ transform: `translateY(${previous - top}px)` }, { transform: "translateY(0)" }], reorderAnimation);
      }
    }
  }, [actions]);

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

  function moved(list: AiAction[], id: number, to: number) {
    const next = list.filter((action) => action.id !== id);
    next.splice(to, 0, list.find((action) => action.id === id)!);
    return next;
  }

  function followPointer() {
    const current = drag.current;
    const card = current && cards.current.get(current.id);
    if (!current || !card) return;
    card.style.transform = `translateY(${current.startTop + current.lastY - current.startY - card.offsetTop}px)`;
  }

  function pointerDown(event: PointerEvent<HTMLButtonElement>, id: number) {
    const card = cards.current.get(id);
    if (event.button !== 0 || !card) return;
    const move = (moveEvent: globalThis.PointerEvent) => pointerMove(moveEvent.clientY);
    const drop = () => endDrag(true);
    const cancel = () => endDrag(false);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", drop);
    window.addEventListener("pointercancel", cancel);
    const detach = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", drop);
      window.removeEventListener("pointercancel", cancel);
    };
    drag.current = { id, startY: event.clientY, lastY: event.clientY, startTop: card.offsetTop, saved: actions, active: false, detach };
  }

  function pointerMove(clientY: number) {
    const current = drag.current;
    const card = current && cards.current.get(current.id);
    if (!current || !card) return;
    current.lastY = clientY;
    if (!current.active) {
      if (Math.abs(current.lastY - current.startY) < dragThresholdPx) return;
      current.active = true;
      setDraggingId(current.id);
      setDragCursor(true);
    }
    followPointer();
    const center = current.startTop + current.lastY - current.startY + card.offsetHeight / 2;
    const list = order.current;
    const target = list.filter((action) => {
      const other = cards.current.get(action.id);
      return action.id !== current.id && other !== undefined && other.offsetTop + other.offsetHeight / 2 < center;
    }).length;
    if (target !== list.findIndex((action) => action.id === current.id)) setActions(moved(list, current.id, target));
  }

  function endDrag(keep: boolean) {
    const current = drag.current;
    drag.current = null;
    current?.detach();
    if (!current?.active) return;
    setDraggingId(null);
    setDragCursor(false);
    const card = cards.current.get(current.id);
    if (card) {
      const from = card.style.transform;
      card.style.transform = "";
      if (from && !matchMedia("(prefers-reduced-motion: reduce)").matches) card.animate([{ transform: from }, { transform: "translateY(0)" }], reorderAnimation);
    }
    if (!keep) setActions(current.saved);
    else if (order.current.some((action, index) => action.id !== current.saved[index]?.id)) reorder(order.current);
  }

  useEffect(() => () => {
    drag.current?.detach();
    setDragCursor(false);
  }, []);

  function moveWithKeys(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "Escape" && drag.current?.active) {
      event.preventDefault();
      endDrag(false);
      return;
    }
    const target = { ArrowUp: index - 1, ArrowDown: index + 1 }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    if (target >= 0 && target < actions.length) reorder(moved(actions, actions[index].id, target));
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
          {actions.map((action, index) => (
            <li key={action.id} ref={(card) => { if (card) cards.current.set(action.id, card); else cards.current.delete(action.id); }}
              className={clsx("flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border border-ink/10 bg-surface py-2 pr-2 pl-1", draggingId === action.id && "relative z-10 border-ink/25 shadow-lg")}>
              <button type="button" onPointerDown={(event) => pointerDown(event, action.id)} onKeyDown={(event) => moveWithKeys(event, index)}
                aria-label={`Reorder ${action.name}. Drag, or use the up and down arrow keys.`} title="Drag to reorder, or use ↑ ↓"
                className={clsx("flex h-8 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted", "hover:bg-ink/5 hover:text-ink active:cursor-grabbing")}>
                <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true"><circle cx="3" cy="3" r="1.3" /><circle cx="9" cy="3" r="1.3" /><circle cx="3" cy="8" r="1.3" /><circle cx="9" cy="8" r="1.3" /><circle cx="3" cy="13" r="1.3" /><circle cx="9" cy="13" r="1.3" /></svg>
              </button>
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
