import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type MouseEvent,
} from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { TableKit } from "@tiptap/extension-table";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import "prosemirror-view/style/prosemirror.css";
import clsx from "clsx";
import { updatePage } from "../../lib/pages";
import { pageImage } from "../../lib/page-image";
import AlignableImage from "./AlignableImage";
import BlockDragHandle from "./BlockDragHandle";
import FindBar from "./FindBar";
import FindInPage from "./FindInPage";
import PageOutline from "./PageOutline";
import SelectionMenu from "./SelectionMenu";
import SlashCommands from "./SlashCommands";
import { BodyText } from "../../../../shared/ui/Typography";

const SAVE_DELAY = 800;
const SAVED_VISIBLE_DELAY = 2000;

export default function PageEditor({
  pageId,
  content,
  onSaved,
}: Readonly<{
  pageId: number;
  content: string | null;
  onSaved: (content: string) => void;
}>) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const [findOpen, setFindOpen] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hideTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pendingContent = useRef<string | null>(null);

  async function flushPendingSave() {
    if (timeout.current) {
      clearTimeout(timeout.current);
      timeout.current = undefined;
    }
    if (pendingContent.current === null) return;
    const html = pendingContent.current;
    pendingContent.current = null;
    try {
      await updatePage(pageId, { content: html });
    } catch {
      pendingContent.current = html;
    }
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({ table: { resizable: false } }),
      AlignableImage.configure({ allowBase64: true }),
      SlashCommands,
      FindInPage,
    ],
    content: content || "",
    editorProps: {
      attributes: { class: clsx("page-editor-content focus:outline-none") },
      handlePaste: (view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter(
          (file) => file.type.startsWith("image/"),
        );
        if (files.length === 0) return false;
        event.preventDefault();
        for (const file of files) {
          void pageImage(file)
            .then((src) => {
              const node = view.state.schema.nodes.image.create({ src });
              view.dispatch(view.state.tr.replaceSelectionWith(node));
            })
            .catch(() => {});
        }
        return true;
      },
    },
    onUpdate: ({ editor }) => {
      setStatus("idle");
      const html = editor.getHTML();
      pendingContent.current = html;
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => void save(html), SAVE_DELAY);
    },
  });

  useEffect(
    () => () => {
      if (hideTimeout.current) clearTimeout(hideTimeout.current);
      void flushPendingSave();
    },
    [],
  );

  useEffect(() => {
    function flushOnHide() {
      if (document.visibilityState === "hidden") void flushPendingSave();
    }
    function flushOnPageHide() {
      void flushPendingSave();
    }
    document.addEventListener("visibilitychange", flushOnHide);
    window.addEventListener("pagehide", flushOnPageHide);
    return () => {
      document.removeEventListener("visibilitychange", flushOnHide);
      window.removeEventListener("pagehide", flushOnPageHide);
    };
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    const appWindow = getCurrentWindow();
    let active = true;
    let unlisten: (() => void) | undefined;
    appWindow
      .onCloseRequested(async (event) => {
        if (pendingContent.current === null) return;
        event.preventDefault();
        await flushPendingSave();
        await appWindow.close();
      })
      .then((fn) => {
        if (active) unlisten = fn;
        else fn();
      });
    return () => {
      active = false;
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    function openFind(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "f")
        return;
      event.preventDefault();
      setFindOpen(true);
    }
    window.addEventListener("keydown", openFind);
    return () => window.removeEventListener("keydown", openFind);
  }, []);

  useEffect(() => {
    if (!editor) return;
    function manualSave(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "s")
        return;
      event.preventDefault();
      if (timeout.current) clearTimeout(timeout.current);
      void save(editor.getHTML());
    }
    window.addEventListener("keydown", manualSave);
    return () => window.removeEventListener("keydown", manualSave);
  }, [editor]);

  async function save(html: string) {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    setStatus("saving");
    try {
      await updatePage(pageId, { content: html });
      if (pendingContent.current === html) pendingContent.current = null;
      onSaved(html);
      setStatus("saved");
      hideTimeout.current = setTimeout(
        () => setStatus("idle"),
        SAVED_VISIBLE_DELAY,
      );
    } catch {
      setStatus("error");
    }
  }

  if (!editor) return null;

  function toggleLink() {
    setLinkValue(
      editor!.isActive("link")
        ? (editor!.getAttributes("link").href ?? "")
        : "",
    );
    setLinkOpen((open) => !open);
  }

  function applyLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const href = linkValue.trim();
    const chain = editor!.chain().focus().extendMarkRange("link");
    if (href) chain.setLink({ href }).run();
    else chain.unsetLink().run();
    setLinkOpen(false);
  }

  function handleContextMenu(event: MouseEvent) {
    if (editor!.state.selection.empty) return;
    event.preventDefault();
    setMenu({ x: event.clientX, y: event.clientY });
  }

  // Registered on the wrapper, not editorProps.handleDrop: ProseMirror's own
  // drop handling only covers .ProseMirror's own DOM box, so drops landing
  // just outside it (e.g. empty space below short content) fell through to
  // the webview's default "open this file" behavior instead of inserting.
  function handlePageDragOver(event: DragEvent<HTMLDivElement>) {
    if (Array.from(event.dataTransfer.items).some((item) => item.kind === "file")) {
      event.preventDefault();
    }
  }

  function handlePageDrop(event: DragEvent<HTMLDivElement>) {
    const files = Array.from(event.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (files.length === 0) return;
    event.preventDefault();
    const coords = editor!.view.posAtCoords({
      left: event.clientX,
      top: event.clientY,
    });
    const pos = coords ? coords.pos : editor!.state.doc.content.size;
    for (const file of files) {
      void pageImage(file)
        .then((src) => {
          const node = editor!.state.schema.nodes.image.create({ src });
          editor!.view.dispatch(editor!.view.state.tr.insert(pos, node));
        })
        .catch(() => {});
    }
  }

  return (
    <div>
      {linkOpen && (
        <form
          onSubmit={applyLink}
          className={clsx("mb-4 flex items-center gap-2")}
        >
          <input
            autoFocus
            type="url"
            value={linkValue}
            onChange={(event) => setLinkValue(event.target.value)}
            placeholder="https://…"
            className={clsx(
              "h-9 min-w-0 flex-1 rounded-md",
              "border border-ink/20 bg-surface",
              "px-3 text-sm",
              "focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink",
            )}
          />
          <button
            type="submit"
            className={clsx(
              "rounded-md bg-action px-3 py-1.5 text-sm font-medium text-on-action",
              "hover:bg-action/85",
            )}
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => setLinkOpen(false)}
            className={clsx(
              "rounded-md px-3 py-1.5 text-sm text-muted",
              "hover:bg-ink/5",
            )}
          >
            Cancel
          </button>
        </form>
      )}
      <div
        onContextMenu={handleContextMenu}
        onDragOver={handlePageDragOver}
        onDrop={handlePageDrop}
      >
        <EditorContent editor={editor} />
      </div>
      <BlockDragHandle editor={editor} />
      {menu && (
        <SelectionMenu
          editor={editor}
          position={menu}
          onClose={() => setMenu(null)}
          onLink={toggleLink}
        />
      )}
      {findOpen && (
        <FindBar editor={editor} onClose={() => setFindOpen(false)} />
      )}
      <PageOutline editor={editor} />
      {status !== "idle" && (
        <div
          role={status === "error" ? "alert" : "status"}
          className={clsx(
            "fixed right-4 bottom-6 left-4 z-50 flex items-center justify-center gap-3 rounded-md px-4 py-3 shadow-md sm:right-auto sm:left-1/2 sm:-translate-x-1/2",
            "border border-ink/15 bg-surface",
          )}
        >
          <BodyText as="span" tone={status === "error" ? "error" : "text"}>
            {status === "saving" && "Saving…"}
            {status === "saved" && "Saved"}
            {status === "error" && "Couldn’t save your changes."}
          </BodyText>
          {status === "error" && (
            <button
              type="button"
              onClick={() => void save(editor.getHTML())}
              className={clsx(
                "text-sm underline underline-offset-4 text-ink",
                "hover:text-muted",
              )}
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}
