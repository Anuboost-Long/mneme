import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getHTMLFromFragment, type Editor, type EditorEvents } from "@tiptap/react";
import type { AgentConnection } from "../../agent-chat/lib/connections";
import { createPage, PageType } from "../../courses/lib/pages";
import { getActiveProfile } from "../../ai-profiles/lib/profiles";
import { errorMessage } from "../../../shared/lib/errorMessage";
import { ActionOutput, ActionScope, type AiAction } from "./actions";
import { compactHtml, gatherContext } from "./context";
import { markdownToEditorHtml } from "./editorHtml";
import { runAction, type RunScope } from "./runAction";

// Where the editor's page sits — module/course actions read their pages
// from here, and "New page" output is created in this module.
export type ActionLocation = { courseId: number; courseName: string; moduleId: number; moduleName: string; pageTitle: string; aiProfileId: number | null };

export type ActionRun = {
  action: AiAction;
  scope: RunScope;
  placement: Placement;
  text: string;
  status: "running" | "done" | "error";
  error?: string;
};

export type Placement = "selection" | "cursor" | "end";

const undoNoticeMs = 10_000;

const emptyMessages: Record<RunScope, string> = {
  selection: "",
  page: "",
  module: "No pages in this module match this action’s page types.",
  course: "No pages in this course match this action’s page types.",
};

function runScope(action: AiAction, hasSelection: boolean): RunScope {
  switch (action.scope) {
    case ActionScope.Module: return "module";
    case ActionScope.Course: return "course";
    default: return hasSelection ? "selection" : "page";
  }
}

// One action at a time per editor. The selection it started from is kept
// mapped through every later transaction, so text typed elsewhere while
// the agent works doesn't shift where the result lands.
export function useAiAction(editor: Editor, location: ActionLocation) {
  const navigate = useNavigate();
  const [run, setRun] = useState<ActionRun | null>(null);
  const range = useRef({ from: 0, to: 0 });
  const kill = useRef<(() => Promise<void>) | null>(null);
  const runId = useRef(0);
  const cursorPlaced = useRef(false);
  const editedDoc = useRef<Editor["state"]["doc"] | null>(null);
  const [undoNotice, setUndoNotice] = useState<string | null>(null);

  useEffect(() => {
    function mapRange({ transaction }: EditorEvents["transaction"]) {
      range.current = { from: transaction.mapping.map(range.current.from), to: transaction.mapping.map(range.current.to) };
      if (transaction.docChanged && editor.state.doc !== editedDoc.current) setUndoNotice(null);
    }
    function placeCursor() {
      cursorPlaced.current = true;
    }
    editor.on("transaction", mapRange);
    editor.on("focus", placeCursor);
    return () => {
      editor.off("transaction", mapRange);
      editor.off("focus", placeCursor);
      runId.current++;
      void kill.current?.();
    };
  }, [editor]);

  useEffect(() => {
    if (!undoNotice) return;
    const timer = setTimeout(() => setUndoNotice(null), undoNoticeMs);
    return () => clearTimeout(timer);
  }, [undoNotice]);

  function edit(from: number, to: number, html: string, notice: string) {
    editor.chain().focus().insertContentAt({ from, to }, html).scrollIntoView().run();
    editedDoc.current = editor.state.doc;
    setUndoNotice(notice);
  }

  function insertResult(text: string, placement: Placement, notice: string) {
    const { doc } = editor.state;
    let position = doc.content.size;
    if (placement !== "end") {
      const end = doc.resolve(Math.min(range.current.to, doc.content.size));
      position = end.depth > 0 ? end.after(1) : end.pos;
    }
    edit(position, position, markdownToEditorHtml(text), notice);
  }

  function undo() {
    if (editor.state.doc === editedDoc.current) editor.chain().focus().undo().run();
    setUndoNotice(null);
  }

  async function createResultPage(action: AiAction, scope: RunScope, text: string) {
    const subject = { selection: location.pageTitle, page: location.pageTitle, module: location.moduleName, course: location.courseName }[scope];
    const page = await createPage(location.moduleId, { title: `${action.name}: ${subject}`, type: PageType.Notes, content: markdownToEditorHtml(text) });
    navigate(`/courses/${location.courseId}/modules/${location.moduleId}/pages/${page.id}`);
  }

  async function start(connection: AgentConnection, action: AiAction) {
    void kill.current?.();
    kill.current = null;
    const id = ++runId.current;
    const update = (patch: (current: ActionRun) => ActionRun) => {
      if (runId.current === id) setRun((current) => current && patch(current));
    };
    const fail = (message: string) => update((current) => ({ ...current, status: "error", error: message }));

    const { selection } = editor.state;
    let placement: Placement = "end";
    if (!selection.empty) placement = "selection";
    else if (cursorPlaced.current) placement = "cursor";
    const scope = runScope(action, !selection.empty);
    range.current = { from: selection.from, to: selection.to };
    setUndoNotice(null);
    setRun({ action, scope, placement, text: "", status: "running" });

    async function finish(text: string) {
      if (runId.current !== id) return;
      switch (action.output) {
        case ActionOutput.InsertBelow:
          insertResult(text, placement, `${action.name} added to the page.`);
          discard();
          break;
        case ActionOutput.NewPage:
          try {
            await createResultPage(action, scope, text);
            discard();
          } catch (error) {
            update((current) => ({ ...current, text, status: "error", error: errorMessage(error, "Couldn’t create the new page. Copy the result instead.") }));
          }
          break;
        default:
          update((current) => ({ ...current, text, status: "done" }));
      }
    }

    try {
      let html: string;
      if (scope === "module" || scope === "course") html = await gatherContext(action, location);
      else html = compactHtml(scope === "selection" ? getHTMLFromFragment(selection.content().content, editor.schema) : editor.getHTML());
      if (!html) { fail(emptyMessages[scope]); return; }
      const profile = await getActiveProfile(location.courseId);
      if (runId.current !== id) return;

      const handle = await runAction(connection, action, scope, html, profile, (event) => {
        switch (event.type) {
          case "text": update((current) => ({ ...current, text: current.text + event.text })); break;
          case "done": void finish(event.text); break;
          case "error": fail(event.message); break;
        }
      });
      if (runId.current === id) kill.current = handle.kill;
      else void handle.kill();
    } catch (error) {
      fail(errorMessage(error, `Couldn’t start ${connection.name}. Check it’s installed and try again.`));
    }
  }

  function stop() {
    void kill.current?.();
  }

  function discard() {
    runId.current++;
    void kill.current?.();
    kill.current = null;
    setRun(null);
  }

  function insertBelow() {
    if (!run) return;
    insertResult(run.text, run.placement, `${run.action.name} added to the page.`);
    discard();
  }

  function addSection() {
    if (!run) return;
    const text = run.text.trimStart().startsWith("#") ? run.text : `## ${run.action.name}\n\n${run.text}`;
    insertResult(text, run.placement, `${run.action.name} added as a section.`);
    discard();
  }

  function replaceSelection() {
    if (!run) return;
    edit(range.current.from, range.current.to, markdownToEditorHtml(run.text), "Selection replaced.");
    discard();
  }

  async function saveAsPage() {
    if (!run) return;
    try {
      await createResultPage(run.action, run.scope, run.text);
      discard();
    } catch (error) {
      setRun({ ...run, status: "error", error: errorMessage(error, "Couldn’t create the new page. Copy the result instead.") });
    }
  }

  return { run, start, stop, discard, insertBelow, addSection, replaceSelection, saveAsPage, undoNotice, undo, dismissUndo: () => setUndoNotice(null) };
}
