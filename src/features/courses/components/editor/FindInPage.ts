import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

export type FindMatch = { from: number; to: number };
export type FindState = { query: string; matches: FindMatch[]; active: number };

export const findPluginKey = new PluginKey<FindState>("findInPage");

function findMatches(doc: ProseMirrorNode, query: string): FindMatch[] {
  const matches: FindMatch[] = [];
  if (!query) return matches;
  const needle = query.toLowerCase();
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const text = node.text.toLowerCase();
    let index = text.indexOf(needle);
    while (index !== -1) {
      matches.push({ from: pos + index, to: pos + index + needle.length });
      index = text.indexOf(needle, index + 1);
    }
  });
  return matches;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    findInPage: {
      setFindQuery: (query: string) => ReturnType;
      findNext: () => ReturnType;
      findPrevious: () => ReturnType;
      clearFind: () => ReturnType;
    };
  }
}

const FindInPage = Extension.create({
  name: "findInPage",

  addProseMirrorPlugins() {
    return [
      new Plugin<FindState>({
        key: findPluginKey,
        state: {
          init: () => ({ query: "", matches: [], active: -1 }),
          apply(tr, value) {
            const meta = tr.getMeta(findPluginKey) as Partial<FindState> | undefined;
            if (meta?.query !== undefined) {
              const matches = findMatches(tr.doc, meta.query);
              return { query: meta.query, matches, active: matches.length ? 0 : -1 };
            }
            if (meta?.active !== undefined) return { ...value, active: meta.active };
            if (tr.docChanged && value.query) {
              const matches = findMatches(tr.doc, value.query);
              return { ...value, matches, active: matches.length ? Math.min(value.active, matches.length - 1) : -1 };
            }
            return value;
          },
        },
        props: {
          decorations(state) {
            const found = findPluginKey.getState(state);
            if (!found || found.matches.length === 0) return DecorationSet.empty;
            return DecorationSet.create(state.doc, found.matches.map((match, index) =>
              Decoration.inline(match.from, match.to, { class: index === found.active ? "find-match find-match-active" : "find-match" }),
            ));
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      setFindQuery: (query: string) => ({ tr, dispatch }) => {
        if (dispatch) dispatch(tr.setMeta(findPluginKey, { query }));
        return true;
      },
      findNext: () => ({ state, tr, dispatch }) => {
        const found = findPluginKey.getState(state);
        if (!found || found.matches.length === 0) return false;
        if (dispatch) dispatch(tr.setMeta(findPluginKey, { active: (found.active + 1) % found.matches.length }));
        return true;
      },
      findPrevious: () => ({ state, tr, dispatch }) => {
        const found = findPluginKey.getState(state);
        if (!found || found.matches.length === 0) return false;
        if (dispatch) dispatch(tr.setMeta(findPluginKey, { active: (found.active - 1 + found.matches.length) % found.matches.length }));
        return true;
      },
      clearFind: () => ({ tr, dispatch }) => {
        if (dispatch) dispatch(tr.setMeta(findPluginKey, { query: "" }));
        return true;
      },
    };
  },
});

export default FindInPage;
