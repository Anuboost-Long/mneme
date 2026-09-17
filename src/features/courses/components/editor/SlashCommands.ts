import { Extension, type Editor, type Range } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion, { type SuggestionKeyDownProps, type SuggestionProps } from "@tiptap/suggestion";
import { blockCommands, type BlockCommand } from "./blockCommands";
import SlashMenu, { type SlashMenuHandle } from "./SlashMenu";

const SlashCommands = Extension.create({
  name: "slashCommands",
  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,
        items: ({ query }: { query: string }) =>
          blockCommands.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())),
        command: ({ editor, range, props }: { editor: Editor; range: Range; props: BlockCommand }) => {
          editor.chain().focus().deleteRange(range).run();
          props.run(editor);
        },
        render: () => {
          let component: ReactRenderer<SlashMenuHandle> | null = null;
          let unmount: (() => void) | null = null;
          return {
            onStart: (props: SuggestionProps<BlockCommand, BlockCommand>) => {
              component = new ReactRenderer(SlashMenu, {
                props: { items: props.items, command: (item: BlockCommand) => props.command(item) },
                editor: props.editor,
              });
              unmount = props.mount(component.element);
            },
            onUpdate: (props: SuggestionProps<BlockCommand, BlockCommand>) => {
              component?.updateProps({ items: props.items, command: (item: BlockCommand) => props.command(item) });
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
