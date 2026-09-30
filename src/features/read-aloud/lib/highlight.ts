// Each name is styled by ::highlight(<name>) in App.css.
type HighlightName = "read-aloud" | "audiobook";

// One highlight per name, registered once, whose range moves along the
// text. Swapping its range makes WebKit repaint both the old and new
// spot; deleting and re-registering highlights could leave a stale one
// painted. Older WebKit (before macOS 14.2) has no highlight API and
// just shows nothing.
const highlights = new Map<HighlightName, Highlight>();

export function paintHighlight(name: HighlightName, range: Range | null) {
  if (typeof Highlight === "undefined") return;
  let highlight = highlights.get(name);
  if (!highlight) {
    highlight = new Highlight();
    highlights.set(name, highlight);
    CSS.highlights.set(name, highlight);
  }
  highlight.clear();
  if (range) highlight.add(range);
}

// Clear of the playback deck at the bottom of the window.
export function keepInView(range: Range) {
  const rect = range.getBoundingClientRect();
  if (rect.top >= 80 && rect.bottom <= window.innerHeight - 200) return;
  range.startContainer.parentElement?.scrollIntoView({
    block: "center",
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
  });
}
