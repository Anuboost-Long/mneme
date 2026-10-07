import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

const reorderAnimation: KeyframeAnimationOptions = { duration: 200, easing: "cubic-bezier(0.2, 0, 0, 1)" };

// Below this, a press on the handle stays a click.
const DRAG_THRESHOLD_PX = 4;

type Drag<T> = {
  id: number;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  startLeft: number;
  startTop: number;
  saved: T[];
  active: boolean;
  detach: () => void;
};

function setDragCursor(on: boolean) {
  document.body.style.cursor = on ? "grabbing" : "";
  document.body.style.userSelect = on ? "none" : "";
}

function moved<T extends { id: number }>(list: T[], id: number, to: number) {
  const item = list.find((entry) => entry.id === id);
  if (!item) return list;
  const next = list.filter((entry) => entry.id !== id);
  next.splice(to, 0, item);
  return next;
}

const reducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// Drag-to-reorder for a list or a grid: drag an item by its handle, or
// press the arrow keys on the handle; Escape cancels a drag. Neighbours
// slide out of the way as the item passes them. `onReorder` gets the new
// order once, when it actually changed.
export function useDragReorder<T extends { id: number }>(source: T[], onReorder: (next: T[]) => void) {
  const [preview, setPreview] = useState<T[] | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const items = preview ?? source;
  const drag = useRef<Drag<T> | null>(null);
  const elements = useRef(new Map<number, HTMLElement>());
  const positions = useRef(new Map<number, { left: number; top: number }>());
  const order = useRef(items);

  useLayoutEffect(() => {
    order.current = items;
    for (const [id, element] of elements.current) {
      const now = { left: element.offsetLeft, top: element.offsetTop };
      const previous = positions.current.get(id);
      positions.current.set(id, now);
      if (drag.current?.active && drag.current.id === id) followPointer();
      else if (!reducedMotion() && previous && (previous.left !== now.left || previous.top !== now.top)) {
        element.animate(
          [{ transform: `translate(${previous.left - now.left}px, ${previous.top - now.top}px)` }, { transform: "translate(0, 0)" }],
          reorderAnimation
        );
      }
    }
  }, [items]);

  useEffect(() => () => {
    drag.current?.detach();
    setDragCursor(false);
  }, []);

  function followPointer() {
    const current = drag.current;
    const element = current && elements.current.get(current.id);
    if (!current || !element) return;
    const x = current.startLeft + current.lastX - current.startX - element.offsetLeft;
    const y = current.startTop + current.lastY - current.startY - element.offsetTop;
    element.style.transform = `translate(${x}px, ${y}px)`;
  }

  function pointerDown(event: PointerEvent<HTMLElement>, id: number) {
    const element = elements.current.get(id);
    if (event.button !== 0 || !element) return;
    const move = (moveEvent: globalThis.PointerEvent) => pointerMove(moveEvent.clientX, moveEvent.clientY);
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
    drag.current = {
      id,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      startLeft: element.offsetLeft,
      startTop: element.offsetTop,
      saved: items,
      active: false,
      detach
    };
  }

  function pointerMove(clientX: number, clientY: number) {
    const current = drag.current;
    const element = current && elements.current.get(current.id);
    if (!current || !element) return;
    current.lastX = clientX;
    current.lastY = clientY;
    if (!current.active) {
      if (Math.hypot(current.lastX - current.startX, current.lastY - current.startY) < DRAG_THRESHOLD_PX) return;
      current.active = true;
      setDraggingId(current.id);
      setDragCursor(true);
    }
    followPointer();
    const centerX = current.startLeft + current.lastX - current.startX + element.offsetWidth / 2;
    const centerY = current.startTop + current.lastY - current.startY + element.offsetHeight / 2;
    const list = order.current;
    // Reading order. A list compares vertical centres; a grid (items in
    // more than one column) takes rows first, then left to right.
    const grid = new Set([...elements.current.values()].map((other) => other.offsetLeft)).size > 1;
    const target = list.filter((item) => {
      const other = elements.current.get(item.id);
      if (item.id === current.id || !other) return false;
      const otherX = other.offsetLeft + other.offsetWidth / 2;
      const otherY = other.offsetTop + other.offsetHeight / 2;
      if (!grid) return otherY < centerY;
      if (centerY >= other.offsetTop + other.offsetHeight) return true;
      if (centerY < other.offsetTop) return false;
      return otherX < centerX;
    }).length;
    if (target === list.findIndex((item) => item.id === current.id)) return;
    // Kept here as well as in state: a quick release can land before React
    // re-renders, and endDrag must still see where the item was dropped.
    order.current = moved(list, current.id, target);
    setPreview(order.current);
  }

  function endDrag(keep: boolean) {
    const current = drag.current;
    drag.current = null;
    current?.detach();
    if (!current?.active) return;
    setDraggingId(null);
    setDragCursor(false);
    const element = elements.current.get(current.id);
    if (element) {
      const from = element.style.transform;
      element.style.transform = "";
      if (from && !reducedMotion()) element.animate([{ transform: from }, { transform: "translate(0, 0)" }], reorderAnimation);
    }
    const changed = order.current.some((item, index) => item.id !== current.saved[index]?.id);
    if (keep && changed) onReorder(order.current);
    setPreview(null);
  }

  function moveWithKeys(event: KeyboardEvent<HTMLElement>, index: number) {
    if (event.key === "Escape" && drag.current?.active) {
      event.preventDefault();
      endDrag(false);
      return;
    }
    const target = { ArrowUp: index - 1, ArrowLeft: index - 1, ArrowDown: index + 1, ArrowRight: index + 1 }[event.key];
    if (target === undefined) return;
    event.preventDefault();
    if (target >= 0 && target < items.length) onReorder(moved(items, items[index].id, target));
  }

  return {
    items,
    draggingId,
    itemRef: (id: number) => (element: HTMLElement | null) => {
      if (element) elements.current.set(id, element);
      else elements.current.delete(id);
    },
    handleProps: (id: number, index: number) => ({
      onPointerDown: (event: PointerEvent<HTMLElement>) => pointerDown(event, id),
      onKeyDown: (event: KeyboardEvent<HTMLElement>) => moveWithKeys(event, index)
    })
  };
}
