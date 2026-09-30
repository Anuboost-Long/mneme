import { Extension, type Editor, type Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";
import { blockCommands, matchesSlashQuery, slashCategories, type SlashItem } from "./blockCommands";
import SlashMenu, { type SlashMenuHandle } from "./SlashMenu";

type SlashStorage = {
  // Set by the page's AI actions while they're mounted, so AI actions show
  // in the menu under "AI" without this extension knowing how they run.
  loadAiItems: (() => Promise<SlashItem[]>) | null;
};

declare module "@tiptap/core" {
  interface Storage {
    slashCommands: SlashStorage;
  }
}

const byCategory = (a: SlashItem, b: SlashItem) =>
  slashCategories.indexOf(a.category) - slashCategories.indexOf(b.category);

async function aiItems(editor: Editor) {
  try {
    return (await editor.storage.slashCommands.loadAiItems?.()) ?? [];
  } catch {
    return [];
  }
}

const SlashCommands = Extension.create({
  name: "slashCommands",
  addStorage(): SlashStorage {
    return { loadAiItems: null };
  },
  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,
        items: async ({ query, editor }: { query: string; editor: Editor }) =>
          [...blockCommands, ...(await aiItems(editor))]
            .filter((item) => matchesSlashQuery(item, query))
            .sort(byCategory),
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: SlashItem }) => {
          editor.chain().focus().deleteRange(range).run();
          props.run(editor);
        },
        render: () => {
          let component: ReactRenderer<SlashMenuHandle> | null = null;
          let unmount: (() => void) | null = null;
          return {
            onStart: (props: SuggestionProps<SlashItem, SlashItem>) => {
              component = new ReactRenderer(SlashMenu, {
                props: { items: props.items, command: (item: SlashItem) => props.command(item) },
                editor: props.editor,
              });
              unmount = props.mount(component.element);
            },
            onUpdate: (props: SuggestionProps<SlashItem, SlashItem>) => {
              component?.updateProps({ items: props.items, command: (item: SlashItem) => props.command(item) });
            },
            onKeyDown: (props: SuggestionKeyDownProps) => component?.ref?.onKeyDown(props.event) ?? false,
            onExit: () => {
              unmount?.();
              component?.destroy();
            },
          };
        },
      },
    };
  },
  addProseMirrorPlugins() {
    return [Suggestion({ editor: this.editor, ...this.options.suggestion })];
  },
});

export default SlashCommands;
