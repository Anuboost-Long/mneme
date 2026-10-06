# Phase 20 — AI Context System

Source: `AI Learning Workspace — Development Roadmap.md`, Phase 20. Builds
on agent chat (`19-agent-chat.md`), AI actions (`21-ai-quick-actions.md`,
`22-custom-ai-actions.md`), AI profiles (`23-ai-context-profiles.md`),
OCR (`15-ocr.md`) and recordings (`16`/`17`). No chain-sdk capability
needed: everything comes from the local database, `desktop.files` and
`desktop.vision`, which mneme already uses.

## Status — 6 October 2026

**Built and run in the dev build.** On "Chapter 2. Risk Analysis" the
chat side panel showed "Context · AI profile · Course · Module · Page",
and Selection appeared once a paragraph was selected. A real Claude turn
answered "which course, module and page am I on, and what does my
selection say?" correctly without tools. Explain on a selection showed
Working on, AI profile, Course, Module and Page in the result's Context.
On a temporary page (erased afterwards) a `.txt` attachment and a
transcript went in full for an action and as names and ids for Claude
chat. With an agent that can't take pictures, the page's 8 pictures were
read on the device (0.7 s once Vision was warm). `tests/ai-context.test.mjs`
covers pointers vs content, selection runs, module/course runs, the
transcript dedupe and the budget cut.

Not yet run: an action through a custom agent end to end (the image text
it would get was checked through the builder in the app).

## Goal

Give the agent an automatic picture of what the student is working on,
in layers, without sending more than it needs, and show the student
what it was given.

## Layers

In the order the agent receives them:

| Layer        | What it holds                                                                                        |
| ------------ | ---------------------------------------------------------------------------------------------------- |
| AI profile   | The active profile's preferences (Phase 23). Already sent as framing; listed so it's visible.        |
| Course       | Name, code, semester, school, instructor, description.                                               |
| Module       | Name, description, and its pages by title, type and status (pages are flat, so this is the nearest thing to "child pages"). |
| Page         | Title, type, status; its content only when it isn't already the subject.                             |
| Selection    | The selected text.                                                                                   |
| Attachments  | The page's attached files by name, type and size; the text of small plain-text files (`.txt`, `.md`, `.csv`, `.json`, ...). |
| Image text   | AI actions only: text read on the device (Vision OCR) from pictures the agent can't receive itself.  |
| Transcripts  | The page's recordings' transcripts, skipped when the transcript is already in the page.              |
| Prompt       | The action's or the user's own request.                                                              |

## Where it's used

- **AI actions** (`ai-actions/lib/useAiAction.ts`): the subject (selection,
  picture, page, module or course) is unchanged; the context builder adds
  a `<context>` block of background layers ahead of it, and the task says
  it's background only.
  - Selection or picture: course, module, page details (no page content),
    attachments, image text, transcripts.
  - Whole page: course, module, page details, attachments, image text,
    transcripts.
  - Whole module / course: course (and module) details only; the pages
    are already the subject.
- **Agent chat** (side panel, and ⌘P → Ask): replaces the old one-line
  "page id N is open" note.
  - Claude and Codex have mneme's tools, so they get pointers: course,
    module and page names and ids, the module's pages, attachment and
    recording names, and the selection. They read anything else with
    `get_page`, `read_transcript`, `get_page_images`.
  - Gemini, Copilot, Cursor and custom agents have no tools, so they get
    the content itself: page text, selection, attachment text and
    transcripts, within the budget. Pictures stay `[Picture: alt]`
    markers: loading a page's pictures took about 5 s in the dev build,
    and the first OCR pass about 30 s, too long to hold up a message.
  - The context is rebuilt each time a message is sent, so edits and the
    current selection are always what goes.
  - The full Chat screen isn't tied to a page and sends no context.

## Not sending more than needed

- Empty layers are left out.
- Agents with tools get pointers, not content.
- A selection run sends the page's details, not the whole page again.
- A transcript already pasted into the page isn't sent a second time.
- Background layers share a budget (60,000 characters, about 15,000
  tokens). Over it, the lowest layers are cut first: transcripts, then
  attachment text, then image text, then page text. A cut layer says so.
- Pictures go as images to agents that can take them (Claude, Codex);
  only the others get OCR text, kept in memory per picture so a rerun
  doesn't read it again.

## Showing what's used

- A size estimate (characters ÷ 4, shown as "about N tokens").
- **AI action result**: a "Context" disclosure under the header lists
  each layer with what it held and its size.
- **Chat side panel**: above the Ask / Agent switch, "Context" with the
  layers it holds and the estimate; open it to see each layer and size.
  Replaces "Knows you're on …". It refreshes when the selection changes
  and after each reply; what's sent is rebuilt when you press send.
- An AI action's result lists "Working on" first: what the action ran on.

## Code layout

- `features/ai-context/lib/types.ts`: `ContextLayer`, `AiContext`,
  `estimateTokens`.
- `features/ai-context/lib/builder.ts`: `buildActionContext`,
  `buildChatContext`.
- `features/ai-context/lib/selectionState.ts`: the open page's selected
  text, set by the editor, read by chat.
- `features/ai-context/components/ContextSummary.tsx`: the disclosure.

## Out of scope

- Choosing layers by hand per message or per action.
- Text from PDF and other binary attachments (listed by name only).
- Context on the full Chat screen.
- ⌘P → Ask sends the open page's context but not the selection.
- Image text in chat (see above).
- A Guide topic: the screenshots still need taking.

## Manual test plan

1. On a page with a recording transcript, a `.txt` attachment and a
   picture, open the chat side panel: "Context" lists the layers;
   opened, it shows each layer and an estimate.
2. Select a sentence: the Selection layer appears. Ask Claude "explain
   my selection": it answers about that sentence.
3. Run Summarize with Claude: the result's Context lists Course, Module,
   Page, Attachments, Transcripts; no Image text (the picture went as an
   image).
4. Run Summarize with a custom agent: Image text appears in the result's Context.
5. Paste the transcript into the page and rerun: Transcripts is gone.
