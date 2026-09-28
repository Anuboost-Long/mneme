const EDGE_GAP = 8;
const ANCHOR_GAP = 4;

// Positions an open `position: fixed` popover against its anchor: below it
// when there's room, above it when there isn't, and always inside the
// window. Closes on the next scroll, since a fixed popover would otherwise
// float away from its anchor.
export function placePopover(popover: HTMLElement, anchor: HTMLElement, align: "start" | "end") {
  const bounds = anchor.getBoundingClientRect();
  const { width, height } = popover.getBoundingClientRect();
  const fitsBelow = bounds.bottom + ANCHOR_GAP + height <= window.innerHeight - EDGE_GAP;
  const top = fitsBelow ? bounds.bottom + ANCHOR_GAP : bounds.top - ANCHOR_GAP - height;
  const left = align === "end" ? bounds.right - width : bounds.left;
  popover.style.top = `${Math.max(EDGE_GAP, top)}px`;
  popover.style.left = `${Math.min(Math.max(EDGE_GAP, left), window.innerWidth - width - EDGE_GAP)}px`;
  popover.style.visibility = "visible";
  window.addEventListener("scroll", () => { if (popover.matches(":popover-open")) popover.hidePopover(); }, { capture: true, once: true });
}

export function hideUntilPlaced(popover: HTMLElement, newState: string) {
  if (newState === "open") popover.style.visibility = "hidden";
}
