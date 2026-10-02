import Highlight from "@tiptap/extension-highlight";

// The stock extension has no identity per mark — every highlighted span it
// renders is an interchangeable <mark>. Highlights need a stable id so a
// row in the `highlight` table can be matched back to the exact mark in
// the page's own content (see lib/highlight/actions.ts's parseHighlightMarks/
// stripHighlight) — markCommands.ts's highlight command stamps a fresh
// one whenever it turns the mark on.
export default Highlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ref: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-highlight-ref"),
        renderHTML: (attributes) => (attributes.ref ? { "data-highlight-ref": attributes.ref } : {})
      }
    };
  }
});
