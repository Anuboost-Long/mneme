// Added in migration 0008-highlights. `ref` is the id the highlight mark
// extension stamps on its `<mark data-highlight-ref="...">` in the page's
// own content — the join key between a row here and its exact spot in
// that page's HTML, kept in sync by features/courses/lib/highlights.ts
// whenever the page's content is saved. `module_id` is a denormalized
// copy of the owning page's module_id (see the migration's comment).
// `html` (renamed from `text` in 0009-highlight-html) is the highlighted
// span's own markup, not stripped plain text — one <p> per source block
// for a selection that crossed a block boundary.
export interface HighlightRow {
  id: number;
  page_id: number;
  module_id: number;
  ref: string;
  html: string;
  position: number;
  created_at: string;
}
