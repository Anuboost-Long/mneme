const BLOCKS = "h1, h2, h3, h4, h5, h6, p, li, pre, blockquote, td, th, figcaption";

// One piece read aloud. `range` is where its text sits on screen, so the
// word being read can be highlighted; its text is exactly `range.toString()`.
export type ReadableChunk = { text: string; range?: Range };

export function elementChunk(element: Element): ReadableChunk {
  const range = document.createRange();
  range.selectNodeContents(element);
  return { text: range.toString(), range };
}

// Innermost blocks only: a list item wraps its own <p>, and reading both
// would say every item twice. Node views (recordings, images) are app UI,
// not content, so they're skipped.
export function elementChunks(root: Element): ReadableChunk[] {
  return Array.from(root.querySelectorAll(BLOCKS))
    .filter((element) => !element.querySelector(BLOCKS) && !element.closest('[contenteditable="false"]'))
    .map(elementChunk);
}

export function textChunks(text: string): ReadableChunk[] {
  return text.split(/\n+/).map((line) => ({ text: line }));
}

// The part of each text node that `range` covers, in document order.
function textSlices(range: Range) {
  const root = range.commonAncestorContainer;
  const nodes: Text[] = [];
  if (root instanceof Text) nodes.push(root);
  else {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  }
  return nodes
    .filter((node) => range.intersectsNode(node))
    .map((node) => ({
      node,
      from: node === range.startContainer ? range.startOffset : 0,
      to: node === range.endContainer ? range.endOffset : node.length
    }));
}

// The characters [start, end) of `within`'s text, as a range of their own.
export function textRange(within: Range, start: number, end: number): Range | null {
  const result = document.createRange();
  let offset = 0;
  let started = false;
  for (const { node, from, to } of textSlices(within)) {
    const length = to - from;
    if (!started && start < offset + length) {
      result.setStart(node, from + start - offset);
      started = true;
    }
    if (started && end <= offset + length) {
      result.setEnd(node, from + end - offset);
      return result;
    }
    offset += length;
  }
  return null;
}

// The chunk and character range of one sentence, and its trimmed text.
export type Sentence = { chunk: number; start: number; end: number; text: string };

export function sentences(chunks: ReadableChunk[], lang?: string): Sentence[] {
  const segmenter = new Intl.Segmenter(lang, { granularity: "sentence" });
  return chunks.flatMap((chunk, index) =>
    Array.from(segmenter.segment(chunk.text), ({ segment, index: at }) => {
      const start = at + segment.length - segment.trimStart().length;
      const text = segment.trim();
      return { chunk: index, start, end: start + text.length, text };
    }).filter((sentence) => sentence.text)
  );
}
