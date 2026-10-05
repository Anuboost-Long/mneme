# AI Learning Workspace — Development Roadmap

> **Mneme progress — 15 September 2026**
>
> Working copy of the roadmap from Downloads. Mneme uses **Tauri + Chain
> SDK**, rather than the original Electron recommendation, and raw SQLite
> through `desktop.storage`, rather than an ORM. The original plan remains
> below; checked development items indicate implemented code, not a claim
> that every native acceptance check has passed.
>
> Current increment: [Page system](features/06-page-system.md), on top of
> [Module management](features/05-module-management.md) and
> [Course management](features/04-course-management.md). A course now
> opens to a module list; a module opens to a page list; a page can be
> read and edited with a TipTap rich text editor (Phase 7's "Basic
> Editor" pulled forward — headings, bold/italic/underline/strike,
> lists, blockquote, code, links — autosaving), including a Phase 8
> "/" slash-command menu over that same command set. Deleting a course
> or module cascades to its modules/pages. Reordering, icons,
> statuses/covers on pages, checklists, command categories, and the
> Advanced Editor (tables, images, embeds) remain deferred by those
> specs.
> Native app restart/persistence verification is still pending for this UI.
>
> **19 September 2026 update:** Recommended MVP items 1–10 are now all
> implemented — Image Import (pasted/dropped images now write real files
> via `desktop.files` instead of base64) and Basic LMS Page Import
> (Phase 10, below) were the last two. Phase 10's importer also grew
> Phase 13's file picker/drag-and-drop early, accepting PDF/DOCX/Markdown
> files as an alternative to a URL. Both list views (pages, modules) also
> gained search/filter/sort/grouping/list-view beyond what any single
> roadmap phase called for.
>
> **Correction:** the AI direction here is agent-accessible, not a
> chat-with-a-stored-API-key model — mneme should expose its data/actions
> so an external AI agent (Claude Code, Claude Desktop, any MCP client)
> can call into it, not have mneme call out to a provider itself. That's
> **Phase 25 (AI Agent Tools)**, not Phase 19 — mneme never sends a
> request to a model provider and never holds an API key under this
> model, so the two requests below are withdrawn.
>
> ~~Next up per the MVP order is **Phase 19 (Basic AI Integration)** —
> blocked on two capabilities chain-sdk doesn't have yet: outbound HTTP
> `POST` (today's `http` capability is GET-only) and secure secret
> storage for an API key (today's `storage` is unencrypted SQLite, so a
> raw column would also leak into `Backup.tsx`'s export). Written up as
> `docs/chain-sdk-requests/07-http-post.md` and
> `08-secure-secret-storage.md`.~~
>
> Next up is actually **Phase 25 (AI Agent Tools)** — blocked on a local
> server capability chain-sdk doesn't have (a webview can't open a
> listening socket itself), so external agents have a way to call in.
> Written up as `docs/chain-sdk-requests/09-agent-tool-server.md`.
>
> **23 September 2026 update:** Phase 25 and agent chat (MVP item 11)
> are in. Phase 21 (AI Quick Actions, MVP item 12 "Summarize Page") is
> now implemented for selected text and whole pages, with no new
> chain-sdk capability needed: see
> [AI quick actions](features/21-ai-quick-actions.md). Module-wide
> actions, flashcards/quiz, and transcribe are deferred there. Next is
> Phase 22 (Custom AI Actions, MVP item 13).
>
> **23 September 2026, later:** Phase 22 (Custom AI Actions, MVP item 13)
> is implemented: see [Custom AI actions](features/22-custom-ai-actions.md).
> It needed one chain-sdk change, stdin for `processRunner`
> (`chain-sdk-requests/12-process-runner-stdin.md`), now shipped. With
> that, **Recommended MVP items 1–13 are all implemented.**
>
> **27 September 2026:** Phase 23 (AI Context Profiles) is implemented:
> see [AI context profiles](features/23-ai-context-profiles.md). No
> chain-sdk change was needed. Next is Phase 24 (AI Output to Editor).
>
> **27 September 2026, later:** Phase 24 (AI Output to Editor) is
> implemented except child pages: see
> [AI output to editor](features/24-ai-output-to-editor.md). No chain-sdk
> change needed. A ⌘P command palette was added alongside
> ([command palette](features/command-palette.md)).
>
> **28 September 2026:** Started the Second Release with its four media
> phases. Phase 18 (Text-to-Speech) is implemented with no chain-sdk
> change: see [Text-to-speech](features/18-text-to-speech.md). Phases 15
> (OCR), 16 (Audio Recording) and 17 (Speech-to-Text) are planned
> ([15](features/15-ocr.md), [16](features/16-audio-recording.md),
> [17](features/17-speech-to-text.md)) and blocked on chain-sdk requests
> `20-image-text-recognition.md`, `18-microphone-capture.md` and
> `19-speech-transcription.md`, sent to the chain-sdk session.
>
> **28 September 2026, later:** request 18 shipped, and Phase 16 (Audio
> Recording) is implemented: see
> [Audio recording](features/16-audio-recording.md).
> Request 20 shipped too, and Phase 15 (OCR) is implemented: see
> [OCR](features/15-ocr.md). Only request 19 (transcription, for Phase
> 17) is still pending.
>
> **28 September 2026, later still:** request 19 shipped, and Phase 17
> (Speech-to-Text) is implemented: see
> [Speech-to-text](features/17-speech-to-text.md). All four Second
> Release media phases (15–18) are now in. chain-sdk's speech support
> raised mneme's minimum to macOS 12.
>
> **Next: [Extensions](features/extensions.md).** Open-source voices
> (Kokoro, Piper) and transcription models (Whisper, SenseVoice) become
> optional downloads that mneme configures itself, instead of shipping in
> the build. Blocked on chain-sdk request `21-model-extensions.md`
> (model downloads plus a bundled sherpa-onnx engine).
> Transcription models are now in (Moonshine, Whisper). Voices wait on a
> GPL-free TTS route in chain-sdk.


## 1. Project Goal

Build a desktop learning workspace using Electron that allows students to:

- Import learning material from their school/LMS.
- Organize courses, modules, lessons, exercises, and discussions.
- Write notes using a Notion-style rich text editor.
- Import PDFs, images, audio, and other learning material.
- Record lectures or personal notes.
- Convert speech to text.
- Convert text to speech.
- Use AI to summarize, explain, organize, transcribe, and transform learning material.
- Create custom AI actions that can be executed with one click.
- Allow an AI agent to understand and work with the current course, module, page, and attachments.

---

# 2. Technology Foundation

Recommended starting stack:

- Electron
- electron-vite
- React
- TypeScript
- Tailwind CSS
- SQLite
- Drizzle ORM or Prisma
- Zustand
- TipTap
- React Router if required
- Zod for validation

Optional later:

- Whisper / speech-to-text API
- OpenAI or other AI providers
- Local AI models
- OCR
- Vector search
- Web scraping / LMS extraction

---

# 3. Phase 1 — Create the Desktop Application

## Goal

Get a clean desktop application (Chain: Tauri + React) running before adding real features.

## Development Steps

- [x] Select React.
- [x] Enable TypeScript.
- [x] Install Tailwind CSS.
- [x] Create the basic application folder structure.
- [x] Create the main application window.
- [x] Set minimum window dimensions.
- [x] Add application title and icon placeholders.
- [x] Configure development mode.
- [x] Configure production build.
- [x] Confirm the application launches on macOS.
- [x] Confirm hot reload works.

Suggested structure:

```text
src/
├── main/
├── preload/
├── renderer/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── features/
│       ├── hooks/
│       ├── stores/
│       ├── lib/
│       └── types/
```

---

# 4. Phase 2 — Application Layout

## Goal

Create the basic workspace interface.

The layout should feel similar to Notion, Obsidian, or modern IDEs.

## Development Steps

- [x] Create the main application shell.
- [x] Add a left sidebar.
- [x] Add a main content area.
- [x] Add an optional right AI sidebar. (Agent chat beside any screen, toggled from the top bar.)
- [x] Add a top navigation/header.
- [x] Make the sidebar collapsible.
- [x] Make the AI panel collapsible. (Open or closed is remembered.)
- [x] Store sidebar state locally.
- [x] Add dark mode.
- [x] Add light mode.
- [x] Store the selected theme.

Basic layout:

```text
┌─────────────────────────────────────────────────────────┐
│ Top Bar                                                 │
├───────────────┬─────────────────────────┬───────────────┤
│               │                         │               │
│ Sidebar       │      Page Editor        │   AI Panel    │
│               │                         │               │
│ Courses       │                         │               │
│ Modules       │                         │               │
│ Pages         │                         │               │
│               │                         │               │
└───────────────┴─────────────────────────┴───────────────┘
```

---

# 5. Phase 3 — Local Database

## Goal

Store the student's workspace locally.

## Development Steps

- [x] Add SQLite.
- [x] Add the ORM. (chain-sdk's `@Table` classes and migrations, plus `desktop.storage.table()` and `transaction()` from request 26. Transactions are in use for deleting and restoring; lib files move from raw SQL to `table()` as they're touched.)
- [x] Create database initialization.
- [x] Create database migrations.
- [x] Create a Course table.
- [x] Create a Module table.
- [x] Create a Page table.
- [x] Create an Attachment table.
- [x] Create an AI Action table.
- [x] Create a Settings table.
- [x] Create timestamps for records. (Every Phase 3 table has `created_at`/`updated_at`; attachment and settings got theirs in migration 0025.)
- [x] Add soft delete support if needed. (Courses, modules and pages go to Recently deleted for 30 days, where they can be previewed, restored or deleted permanently. See features/recently-deleted.md.)
- [x] Test creating records. (`npm test`, and in the running app.)
- [x] Test updating records.
- [x] Test deleting records.
- [x] Test retrieving records after restarting the app. (`tests/persistence.test.mjs` reopens the database file; also checked by restarting the app.)

Basic relationship:

```text
Course
  ↓
Module
  ↓
Page
  ↓
Blocks / Content
```

Example:

```text
Programming Fundamentals
│
├── Module 1
│   ├── Introduction
│   ├── Activity 1
│   └── Discussion 1
│
├── Module 2
│   ├── Loops
│   └── Exercise 1
│
└── Module 3
```

---

# 6. Phase 4 — Course Management

## Goal

Allow users to create and manage courses manually.

## Development Steps

- [x] Add "Create Course".
- [x] Add course name.
- [x] Add course description.
- [x] Add course icon.
- [x] Add course cover. (Stored as a file; shown as a banner on the course page.)
- [x] Add course colour.
- [x] Save the course.
- [x] Display courses in the sidebar.
- [x] Open a course.
- [x] Edit a course.
- [x] Delete a course.
- [x] Reorder courses. (Drag, or arrow keys on the grip; same as AI actions.)
- [x] Add favourite/pinned courses. (Pin from a course's menu; pinned ones list first.)

Later:

- [x] Add semester.
- [x] Add university/school.
- [x] Add instructor.
- [x] Add course code.

---

# 7. Phase 5 — Module Management

## Goal

Allow each course to contain modules.

## Development Steps

- [x] Create a module.
- [x] Assign the module to a course.
- [x] Rename a module.
- [x] Delete a module.
- [x] Reorder modules. (Drag in Course order, or arrow keys on the grip.)
- [x] Collapse modules. (Per module, or Collapse all; remembered per course.)
- [x] Expand modules. (Shows the module's pages inline on the course page.)
- [x] Add module icons. (Same picker as courses, plus No icon.)
- [x] Add module descriptions.
- [x] Add module status.

Possible status values:

```text
Not Started
In Progress
Completed
Revision Needed
```

---

# 8. Phase 6 — Page System

## Goal

Allow modules to contain multiple pages.

Possible page types:

```text
Lesson
Lecture
Exercise
Discussion
Assignment
Notes
Reading
Revision
Custom
```

## Development Steps

- [x] Create a page.
- [x] Add page title.
- [x] Assign page to a module.
- [x] Open the page.
- [x] Rename the page.
- [x] Delete the page.
- [x] Duplicate a page. (Copies content, recordings and cover; lands after the original.)
- [x] Move a page. (To any module, from the page's menu; recordings and highlights follow.)
- [x] Reorder pages. (Drag in Page order, or arrow keys on the grip.)
- [x] Add page icons. (Same picker as modules.)
- [x] Add page covers. (Banner on the page, like course covers.)
- [x] Add page type.
- [x] Add page status. (Not started, In progress, Completed, Revision needed; chip on the page header.)

---

# 9. Phase 7 — Rich Text Editor

## Goal

Build a Notion-like writing experience.

Recommended:

```text
TipTap
```

## Basic Editor

- [x] Add TipTap.
- [x] Create editable page content.
- [x] Save content automatically.
- [x] Restore saved content.
- [x] Add paragraphs.
- [x] Add headings.
- [x] Add bold.
- [x] Add italic.
- [x] Add underline.
- [x] Add strike-through.
- [x] Add bullet lists.
- [x] Add numbered lists.
- [x] Add checklists. (Checklist block; markdown `- [ ]` pastes as one.)
- [x] Add blockquotes.
- [x] Add code blocks.
- [x] Add inline code.
- [x] Add hyperlinks.

## Advanced Editor

- [x] Add tables.
- [x] Add images. (Stored as files; resize and align.)
- [x] Add file attachments. (/file or drop any file; rename, save a copy, delete. Open in its own app or Show in Finder.)
- [x] Add horizontal separators. (/divider.)
- [x] Add callouts. (Note, tip or warning; the icon switches tone.)
- [x] Add collapsible sections. (Open or closed is saved with the page.)
- [x] Add embedded videos. (YouTube or Vimeo link, or a video file.)
- [x] Add audio blocks. (Recording block, Phase 16.)
- [x] Add custom AI blocks. (A saved prompt; its answer stays inside the block and can be regenerated.)

---

# 10. Phase 8 — Slash Commands

## Goal

Allow users to type `/` to create content.

Example:

```text
/text
/heading
/image
/audio
/table
/code
/ai
/summary
```

## Development Steps

- [x] Detect `/`.
- [x] Open command menu.
- [x] Search commands.
- [x] Select commands using keyboard.
- [x] Select commands using mouse.
- [x] Insert selected block.
- [x] Create command categories. (Text, Lists, Insert, AI; keywords like `/h1`, `/todo`, `/audio` also find commands.)
- [x] Allow AI commands later. (Your AI actions appear under AI; on an empty line they run on the whole page.)

---

# 11. Phase 9 — Drag and Drop

## Goal

Make organizing courses and notes easy.

## Development Steps

- [x] Reorder courses. (Drag, or arrow keys on the grip; same as AI actions.)
- [x] Reorder modules. (Drag in Course order, or arrow keys on the grip.)
- [x] Reorder pages. (Drag in Page order, or arrow keys on the grip.)
- [x] Move pages between modules. (From the page's menu, not by drag.)
- [x] Drag files into pages. (Become attachments; videos become players.)
- [x] Drag images into pages.
- [x] Drag audio into pages. (An attachment with a player.)

---

# 12. Phase 10 — LMS Import

## Goal

Allow the user to paste a module URL from their school system.

Example:

```text
Paste LMS URL

https://school.edu/course/module/123
```

The application should extract the learning material and create structured pages.

## Initial Development

- [x] Add an "Import Module" button.
- [x] Create URL input.
- [x] Validate URLs.
- [x] Create an importer service.
- [x] Open or request the page.
- [x] Retrieve HTML.
- [x] Parse page HTML.
- [x] Extract page title.
- [x] Extract headings.
- [x] Extract paragraphs.
- [x] Extract lists.
- [x] Extract links.
- [x] Extract images.
- [x] Extract exercise names.
- [x] Extract discussion names.
- [x] Extract assignment names.

> **3 October 2026:** `findActivities` (`import-sanitize.ts`) finds
> named exercises, discussions, assignments, activities, quizzes, labs,
> tutorials, worksheets, homework and projects inside the one imported
> page. It reads headings, links and bold text, plus list items and
> paragraphs that carry a number ("Assignment 2"). It skips prose like
> "Exercise caution…" and drops duplicates. Works for URL and file
> imports alike. The page's type is still guessed from its title.

## Import Preview

> **3 October 2026:** detected items came back without splitting: the
> preview lists the activities found, and the ticked ones become a
> checklist at the top of the single page. Importing also shows
> progress (named stages, and "Saving pictures 3 of 12" when it
> downloads a page's pictures) instead of a frozen dialog.
>
> **Deliberately not built this way.** Live testing showed the
> checklist-of-detected-items shape below made one URL/file explode into
> many small, confusing pages (a real MDN import once produced 14 of
> them from one link) — this was changed on direct user feedback ("stop
> splitting one content of that url into multiple pages"). The importer
> now always produces exactly **one** page per URL or file, with its
> title/type editable before saving — no per-item checklist, since there
> is only ever one item.

Before importing:

```text
Detected Content

Module 1

✓ Introduction
✓ Lecture Notes
✓ Activity 1
✓ Discussion 1
✓ Exercise 1

[Import Selected]
```

Steps:

- [x] Show detected items. (The preview lists "Activities found in this page", all ticked.)
- [x] Allow users to uncheck items. (Ticked ones become an "Activities" checklist at the top of the one imported page; nothing is split into separate pages.)
- [x] Allow users to rename items. (the one imported page's title is editable before saving)
- [x] Select destination course. (implicit — import happens from within the target module)
- [x] Select destination module. (implicit — import happens from within the target module)
- [x] Import content.
- [x] Convert imported HTML to editor blocks. (sanitized HTML lands in the same TipTap-backed `content` field a normal page uses)

---

# 13. Phase 11 — Authenticated LMS Pages

## Goal

Support school pages that require login.

Do not attempt to bypass school security.

Instead, use the user's authenticated browser session where permitted.

> **Done — 5 October 2026.** On chain-sdk's `desktop.browser`
> (request 36), tested against a real LMS: sign-in, importing signed-in
> pages, and staying signed in. Every LMS lays its pages out
> differently, so per-site reading improvements come later (Phase 12).
> See [Authenticated LMS Pages](features/11-authenticated-lms-pages.md).

## Development Steps

- [x] Create an LMS browser window. (The school window, opened from Import from LMS.)
- [x] Allow the user to log in normally. (A real browser for the site; single sign-on popups work.)
- [x] Store session cookies securely. (In the OS web engine's own store, kept between launches.)
- [x] Detect the current LMS page.
- [x] Add "Import Current Page". (Import this page, in the window's toolbar.)
- [x] Read permitted page content. (The page as it stands, with its same-origin frames.)
- [x] Send page content into the importer. (Same preview as a pasted link; pictures download with the session.)
- [x] Keep login credentials out of the application's database. (mneme keeps the school's address only; Sign out in Settings.)

---

# 14. Phase 12 — Smart Content Detection

> **Done — 5 October 2026**, run in the dev build on a PDF brief, a book
> chapter and Moodle pages. Every import says what kind of page it looks
> like and lists its due dates, activities and files; Ask AI classifies
> a page the rules can't place. See
> [Smart Content Detection](features/12-smart-content-detection.md).

## Goal

Automatically understand imported learning material.

The importer should try to identify:

```text
Module
Lesson
Lecture
Exercise
Discussion
Assignment
Reading
Quiz
Due Date
Resource
```

## Development Steps

- [x] Create rule-based content detection. (Every import says what kind of page it looks like and sets the Type.)
- [x] Detect common heading patterns. (Bold-only and “Week 3” lines; PDFs by font weight and size.)
- [x] Detect numbered activities. (“Activity 2.1”, “Task 3b: …”, and Moodle/Canvas links named by kind.)
- [x] Detect "Discussion".
- [x] Detect "Exercise".
- [x] Detect "Assignment".
- [x] Detect "Quiz". (Quizzes import as Exercise pages.)
- [x] Detect due dates. (Listed with their labels and read as dates; Moodle’s header dates kept.)
- [x] Detect downloadable files. (Listed and linked; downloading them is Phase 40.)
- [x] Add AI classification as a later fallback. (Ask AI in the import preview.)

---

# 15. Phase 13 — File Import

## Goal

Allow learning material to exist inside pages.

Supported initially:

```text
PDF
PNG
JPG
TXT
Markdown
Audio
```

## Development Steps

> File picker + drag-and-drop landed early as part of Phase 10's
> importer — a PDF/DOCX/Markdown file becomes a page's content, the same
> way a URL does, rather than as a separate attachment hanging off an
> existing page. The items below describe that second, still-unbuilt
> thing (a file attached alongside a page rather than converted into
> one) — checking the picker/drag-and-drop boxes here would double-count
> Phase 10's UI for a feature that doesn't actually exist yet.

- [x] Add file picker. (via Phase 10's importer, not a page-attachment picker)
- [x] Add drag-and-drop. (same)
- [x] Store attachment metadata. (Name, type, size.)
- [x] Store local file location.
- [x] Display attachments.
- [x] Open attachments. (In the file's own app, or Show in Finder; files that can run programs only show in Finder.)
- [x] Remove attachments.
- [x] Rename attachments. (The extension is kept.)

---

# 16. Phase 14 — Image Support

## Goal

Allow screenshots, slides, diagrams, and textbook pages to be stored and analysed.

## Development Steps

- [x] Upload image. (/image, native file sheet.)
- [x] Paste image from clipboard.
- [x] Drag image into editor.
- [x] Resize images. (Corner handle; width is saved.)
- [x] Add image captions. (Under the image; saved as `data-caption`, and used as the alt text when there is none.)
- [x] Open full image. (Open full size on the image toolbar; Esc, the close button or a click outside closes it.)
- [x] Add "Extract Text". (Phase 15; plus Extract table.)
- [x] Add "Explain Image". (Image menu; runs on that picture with the agent chosen in AI actions, which must accept images: Claude or Codex.)
- [x] Add "Summarize Image". (Same; the result opens in the AI result panel with Insert below.)
- [x] Add "Insert Extracted Text".

---

# 17. Phase 15 — OCR

## Goal

Turn text inside images into editable page content.

Example:

```text
Screenshot
      ↓
OCR
      ↓
Editable Text
```

## Development Steps

- [x] Create OCR service interface.
- [x] Send image to OCR.
- [x] Receive extracted text.
- [x] Show OCR preview.
- [x] Allow user corrections.
- [x] Insert extracted text below image.
- [x] Replace image with extracted text if requested.
- [x] Send extracted text to AI. (Inserted text is selected for the editor's AI actions; no chat handoff yet.)

---

# 18. Phase 16 — Audio Recording

## Goal

Allow users to record lectures, explanations, or personal notes.

## Development Steps

- [x] Request microphone permission.
- [x] Add Record button.
- [x] Add Pause button.
- [x] Add Resume button.
- [x] Add Stop button.
- [x] Show recording duration.
- [x] Save recording locally.
- [x] Rename recording.
- [x] Attach recording to page.
- [x] Play recording.
- [x] Seek through recording.
- [x] Delete recording.

---

# 19. Phase 17 — Speech-to-Text

## Goal

Turn recordings into written notes.

Flow:

```text
Recording
    ↓
Transcription
    ↓
Raw Transcript
    ↓
AI Cleanup
    ↓
Study Notes
```

## Development Steps

- [x] Create transcription service interface.
- [x] Select recording.
- [x] Send recording for transcription.
- [x] Display progress.
- [x] Save raw transcript.
- [x] Allow transcript editing.
- [x] Insert transcript into page.
- [x] Add "Clean Transcript".
- [x] Add "Summarize Transcript".

---

# 20. Phase 18 — Text-to-Speech

## Goal

Allow students to listen to learning material.

## Development Steps

- [x] Select text.
- [x] Add "Read Aloud".
- [x] Add Play.
- [x] Add Pause.
- [x] Add Stop.
- [x] Add playback speed.
- [x] Add voice selection.
- [x] Add language selection.
- [x] Add "Read Entire Page".
- [x] Add "Read Module Summary". (Reads the module's description; there's no AI-generated summary yet.)

---

# 21. Phase 19 — Basic AI Integration

## Goal

Connect an AI model to the workspace.

Start simple.

## Development Steps

- [x] Connect installed agent CLIs (Claude Code, Codex, Gemini, custom) instead of an AI provider interface.
- [x] Test basic AI request.
- [x] Add the agent chat screen.
- [x] Add message input.
- [x] Send current page content. (The side panel tells the agent which page is open; it reads it with Phase 25's `get_page`.)
- [x] Display AI response.
- [x] Add Markdown response rendering.
- [x] Add loading state.
- [x] Add error handling.
- [x] Add cancel generation.

API key settings and secure key storage were dropped: mneme drives the
user's own agent CLI and never holds a key (see the addendum below).

Do not start with agents yet.

First make basic AI communication reliable.

> **19 September 2026 addendum — this phase's own approach changed.**
> "Create an AI provider interface" / "Add API key settings" / "Store
> keys securely" assumed mneme calls a model provider's API directly
> with a key the user pastes in. The user redirected this: connect to
> **an AI agent CLI the user already has installed and is already paying
> for and authenticated into** — Claude Code, OpenAI Codex — the same
> way they'd run it from a terminal, not a key mneme manages itself.
>
> Concretely: each chat turn spawns the CLI as a one-shot process
> (`claude -p "<message>" --resume "<session_id>" --output-format
> stream-json --include-partial-messages`), streaming its stdout into
> the chat UI as tokens arrive, capturing `session_id` from the first
> turn to pass into every later one. The CLI's own `--mcp-config` points
> at mneme's own agent-server (Phase 25's capability, already built —
> see `09-agent-tool-server.md`), so the agent gets `list_pages`/
> `create_page`/etc. tool access for free — no separate wiring between
> "AI chat" and "AI agent tools," they share the same server.
>
> An Anthropic Agent SDK route was considered and rejected: it's a
> Node.js library requiring mneme to hold its own API key and bundle a
> Node runtime it doesn't have — exactly the model this redirect moves
> away from. Blocked on a new chain-sdk capability (spawn a process,
> stream its stdout, know when it's done — a webview can't do this
> itself) — written up as `docs/chain-sdk-requests/10-subprocess-runner.md`.
> "Store keys securely" (`08-secure-secret-storage.md`, previously
> withdrawn) stays withdrawn — there is still no key for mneme to store
> under this model.
>
> App-level surface: an "Agent Tools" settings section (already has the
> agent-server start/stop toggle from Phase 25) gains a way to pick which
> installed CLI to use, and the chat UI itself is a new screen/panel
> layered over the spawned process — a UI "skin" over an agent the user
> already owns, not a UI over mneme's own AI integration.
>
> **Same day, follow-up correction — not Claude Code alone.** This has
> to support multiple agents, the same way Lazify does: built-in presets
> for Claude Code, Codex, and Gemini CLI (each with its own confirmed
> flags/output format — only Claude Code's are actually verified so far,
> Codex's and Gemini's need real research before implementing, not
> guessing), **plus an open-ended custom entry** — same as Lazify's own
> approach — where the user types in any other agent's name and invoke
> command themselves. A custom agent's stdout format is unknown, so it
> gets a plainer fallback: raw incremental stdout rendered live in the
> chat (a terminal pass-through) rather than parsed token deltas.
>
> **Also added: per-agent usage/statistics** (Lazify tracks this; mneme
> should too) and **mneme-owned session persistence** — "save the session
> until the user deletes it or it reaches its time limit," not depend on
> whatever a CLI's own local session files do. Neither needs a new
> chain-sdk capability: usage/stats is parsing the same stdout stream
> capability 10 already covers (Claude Code's `result` event reports
> `usage`/`total_cost_usd`; an unknown custom agent still yields
> invocation count + duration for free), and session storage is plain
> `desktop.storage` — a new table for conversations/messages/which-agent,
> with a retention setting (delete on user action, or after a configured
> age), same capability every other page/module/course record already
> uses. See `10-subprocess-runner.md`'s "Usage/statistics tracking and
> session persistence" section for the full reasoning.

---

# 22. Phase 20 — AI Context System

## Goal

Give the AI automatic understanding of what the student is currently working on.

Context should be layered.

```text
User Context
     +
Course Context
     +
Module Context
     +
Page Context
     +
Selected Content
     +
Attachments
     +
Custom Prompt
     ↓
AI
```

## Development Steps

- [ ] Create Context Builder service.
- [ ] Add current course context.
- [ ] Add current module context.
- [ ] Add current page context.
- [ ] Add selected text context.
- [ ] Add child-page context.
- [ ] Add attachments.
- [ ] Add image text.
- [ ] Add transcripts.
- [ ] Estimate context size.
- [ ] Avoid sending unnecessary content.
- [ ] Display what context is being used.

---

# 23. Phase 21 — AI Quick Actions

## Goal

Give the user one-click AI operations.

Default actions:

```text
Summarize
Explain
Simplify
Translate
Find Key Points
Create Revision Notes
Generate Flashcards
Generate Quiz
Extract Tasks
Transcribe
Organize Notes
```

## Development Steps

- [x] Create AI Action model.
- [x] Add default actions.
- [x] Add action toolbar.
- [x] Allow actions on selected text.
- [x] Allow actions on current page.
- [x] Allow actions on current module. (Via a custom action whose "Runs on" is Whole module — Phase 22.)
- [x] Show generation progress.
- [x] Show result preview.
- [x] Allow insertion into document.
- [x] Allow replacement of selected text.

---

# 24. Phase 22 — Custom AI Actions

## Goal

Allow users to create their own reusable AI buttons.

Example:

```text
Action Name:
Prepare Discussion

Prompt:
Read the discussion question and related course
material. Explain what I should discuss and identify
the important concepts.

Context:

☑ Current Page
☑ Current Module
☑ Lecture Notes
☑ Images
☐ Entire Course

Output:

○ AI Panel
● Insert Below
○ New Page
```

## Development Steps

- [x] Create "New AI Action".
- [x] Add action name.
- [x] Add action icon.
- [x] Add custom prompt.
- [x] Select context sources.
- [x] Select output mode.
- [x] Save action.
- [x] Edit action.
- [x] Delete action.
- [x] Duplicate action.
- [x] Reorder actions.
- [x] Display custom action in toolbar.

---

# 25. Phase 23 — AI Context Profiles

## Goal

Allow the user to define persistent AI instructions.

Example:

```text
Profile: University Study

I am studying at university.

Use Australian English.

Explain difficult concepts simply but keep important
technical terminology.

Use examples when explaining programming.

Do not automatically answer assessed questions unless
I explicitly request an answer.
```

## Development Steps

- [x] Create AI Profile model.
- [x] Create profile editor.
- [x] Save system instructions.
- [x] Select active profile.
- [x] Add course-specific profiles.
- [x] Add default profile.
- [x] Include active profile in context builder.

---

# 26. Phase 24 — AI Output to Editor

## Goal

AI should not only chat.

It should be able to work directly with the page.

Supported actions:

```text
Insert
Replace
Append
Create Section
Create Page
Create Child Page
```

## Development Steps

- [x] Insert AI output below cursor.
- [x] Replace selected text.
- [x] Append content to page.
- [x] Generate heading + content.
- [x] Generate editor blocks.
- [x] Create page from AI result.
- [ ] Create child page. (Needs a page hierarchy first; pages are flat within a module. See features/24-ai-output-to-editor.md.)
- [x] Add undo support.

---

# 27. Phase 25 — AI Agent Tools

## Goal

Give the AI controlled tools that allow it to work with the workspace.

Initial tools:

```text
read_page
read_module
search_workspace
create_page
update_page
insert_blocks
move_page
inspect_image
read_transcript
create_summary
```

## Development Steps

Build tools individually.

### Tool 1 — Read Page (`get_page`)

- [x] Define input schema.
- [x] Retrieve page.
- [x] Return page content.
- [x] Test manually.
- [x] Allow AI to call it.

### Tool 2 — Search Workspace (`search_pages`)

- [x] Define search input.
- [x] Search page titles.
- [x] Search page content.
- [x] Return matching pages.
- [x] Allow AI to call it.

### Tool 3 — Create Page (`create_page`)

- [x] Define input.
- [x] Validate destination. (create_page and move_page refuse a missing or deleted module, and every changing tool checks its ids before the approval prompt.)
- [x] Create page.
- [x] Return page ID.
- [x] Allow AI to call it.

Repeat this pattern for every tool.

Also built: `list_courses`, `get_course`, `list_modules`, `get_module`
(read_module), `list_pages` and `update_page`, with an approval prompt
for tools that change the workspace.

### Remaining initial tools

- [x] `insert_blocks`. (At the start, the end, or after the first block containing some text; the rest of the page, highlights included, is untouched.)
- [x] `move_page`. (To the end of any module; recordings, attachments and highlights follow.)
- [x] `inspect_image`. (As `get_page_images`: a page's pictures as real image content, in page order.)
- [x] `read_transcript`. (A page's recordings or one recording; null when not transcribed yet.)
- [x] `create_summary`. (Saves the agent's summary as a Notes page right after its page, or at the end of a module.)

---

# 28. Phase 26 — Agent Mode

## Goal

Allow AI to perform multiple actions automatically.

Example:

```text
User:

Prepare Module 3 for revision.
```

Agent:

```text
Read Module 3
      ↓
Read child pages
      ↓
Read lecture transcript
      ↓
Inspect imported images
      ↓
Identify important concepts
      ↓
Generate summary
      ↓
Create Revision Notes page
```

> **Done — 5 October 2026.** See [Agent Mode](features/26-agent-mode.md).

## Development Steps

- [x] Create agent execution loop. (The connected agent CLI runs the loop with mneme’s tools.)
- [x] Allow tool calls. (Phase 25’s tools over the agent server.)
- [x] Store execution history. (Each tool call is saved in the conversation’s transcript.)
- [x] Display current agent action. (A card per tool call, “Running”.)
- [x] Display completed actions. (“Finished” or “Failed”.)
- [x] Add Stop button. (In the message box while the agent works.)
- [x] Add maximum tool-call limit. (50 tool calls per message; past that the agent is told to stop and report.)
- [x] Prevent infinite loops. (The same call more than 3 times in a row is refused.)
- [x] Add error recovery. (A failed tool call is returned to the agent with its reason, so it can try another way.)
- [x] Add user approval system. (Agent wants to make a change: Approve or Deny.)

---

# 29. Phase 27 — Ask Mode vs Agent Mode

## Ask Mode

AI may:

- Read information.
- Analyse information.
- Suggest changes.
- Generate content.

AI should not automatically modify the workspace.

## Agent Mode

AI may:

- Create pages.
- Insert blocks.
- Organize content.
- Rename content.
- Import material.
- Generate summaries.
- Process attachments.

> **Done — 5 October 2026.** Each Chat conversation has an Ask / Agent
> switch above the message box; new ones start in Ask. See
> [Ask Mode and Agent Mode](features/27-ask-and-agent-mode.md).

## Development Steps

- [x] Add Ask mode. (Read tools only; a change is refused and described instead.)
- [x] Add Agent mode. (All tools; the first change in a conversation asks.)
- [x] Show active mode clearly. (The switch and a line on what it allows, above the message box.)
- [x] Restrict tool permissions based on mode. (Ask mode isn't offered the tools that change pages.)
- [x] Require confirmation for destructive operations. (Replacing a page's content asks every time.)

---

# 30. Phase 28 — Agent Permission System

## Goal

Prevent AI from making unwanted changes.

Permission types:

```text
Read
Create
Edit
Move
Delete
External Access
```

Example:

```text
AI wants to:

Create "Module 4 Revision Notes"

[Allow] [Cancel]
```

For safe actions, users can optionally select:

```text
Always allow this action.
```

> **Done — 5 October 2026.** See
> [Agent Permission System](features/28-agent-permissions.md).

## Development Steps

- [x] Define permissions. (Read, Create, Edit, Move, Delete, Use the internet; each tool has one.)
- [x] Categorize AI tools. (Read tools, tools that change pages, and changes that replace a page.)
- [x] Add approval dialog. (Allow or Deny, with Always allow for changes that can be trusted.)
- [x] Save trusted permissions. (Always allow in the prompt, or Settings → Agent tools → Permissions; kept across restarts.)
- [x] Always confirm deletion. (Agents have no delete tool; replacing a page’s content always asks.)
- [x] Create agent activity log. (Settings → Agent tools → Activity: every call and how it ended; the last 1,000 kept.)

---

# 31. Phase 29 — AI Action Packs

## Goal

Bundle useful AI actions together.

> **Mneme — 3 October 2026:** implemented, see
> [AI action packs](features/29-ai-action-packs.md). The built-in
> catalogue goes well beyond the three examples below: 28 packs across
> study skills, maths and data, natural sciences, health, engineering,
> humanities, social sciences, business, languages and writing, arts,
> and teaching.

Example:

### Programming Pack

```text
Explain Code
Find Bugs
Explain Algorithm
Create Practice Exercise
Create Quiz
Simplify Documentation
```

### Lecture Pack

```text
Transcribe
Clean Transcript
Create Notes
Extract Definitions
Create Revision Sheet
```

### Research Pack

```text
Summarize Paper
Extract Claims
Find Evidence
Compare Sources
Generate References
```

## Development Steps

- [x] Create Action Pack format.
- [x] Install pack.
- [x] Remove pack.
- [x] Enable/disable individual actions.
- [x] Export pack.
- [x] Import pack.

---

# 32. Phase 30 — Search

## Goal

Allow users and AI to find anything quickly.

> **Done — 5 October 2026.** Words, attachments and meaning, on the
> device. See [Search](features/30-search.md).

## Development Steps

- [x] Search courses. (Command palette, ⌘P.)
- [x] Search modules.
- [x] Search page titles.
- [x] Search page content. (Shown as “matches content”.)
- [x] Search transcripts. (Recordings screen.)
- [x] Search attachments. (⌘P finds attachments by file name and opens their page.)
- [x] Add keyboard shortcut. (⌘P.)
- [x] Highlight search results. (Find in page, ⌘F, highlights each match.)
- [x] Open result directly.

Later:

- [x] Semantic search. (⌘P lists pages By meaning; the assistant has search_by_meaning.)
- [x] Vector embeddings. (On the device with a downloaded model; chain-sdk request 37.)
- [x] AI search. (⌘P → Ask: the assistant searches and reads your pages to answer.)

---

# 33. Phase 31 — Command Palette

Example:

```text
Cmd + K
```

Commands:

```text
Create Page
Create Module
Import LMS
Import PDF
Start Recording
Ask AI
Summarize Page
Search Workspace
Open Settings
```

## Development Steps

- [x] Build command palette UI.
- [x] Add keyboard shortcut. (Cmd/Ctrl + P.)
- [x] Search commands. (Also searches courses, modules and pages.)
- [x] Execute commands.
- [x] Add recent commands. (The last five, shown when the search is empty.)
- [x] Add the remaining commands: New page, Import from LMS, Import PDF or document (on a module), New module (on a course), Start recording (on a page). Ask AI, Summarize Page, Search Workspace and Open Settings were already in.

---

# 34. Phase 32 — Keyboard Shortcuts

Examples:

```text
Cmd + N      New Page
Cmd + K      Command Palette
Cmd + P      Quick Search
Cmd + Shift + A   AI
Cmd + S      Manual Save
```

## Development Steps

- [x] Create shortcut manager. (`shared/lib/shortcuts/`: `useShortcut(id, run)` follows the current keys; see features/32-keyboard-shortcuts.md.)
- [x] Add default shortcuts. (Command palette ⌘P, new page ⌘N, find ⌘F, save ⌘S, sidebar ⌘\, agent chat ⌘⇧A, settings ⌘,; Ctrl on Windows.)
- [x] Detect shortcut conflicts. (A key already used by another shortcut, the editor or the system is refused with what it does.)
- [x] Allow customization. (Settings → Keyboard: change, reset, reset all.)
- [x] Save preferences. (Only changed shortcuts are stored, in settings.)

---

# 35. Phase 33 — Customization

## Workspace Customization

- [x] Light mode. (Settings → General → Appearance.)
- [x] Dark mode.
- [ ] Custom accent colour.
- [ ] Sidebar width.
- [ ] Editor width.
- [ ] Font selection.
- [ ] Font size.
- [ ] Compact mode.

## Course Customization

- [x] Icons. (122 icons in 8 groups, with search.)
- [x] Covers. (Course and page covers.)
- [x] Colours. (Course colours.)
- [x] Custom module icons. (Icons, emoji or your own picture.)
- [ ] Custom page types.

---

# 36. Phase 34 — Dashboard

## Goal

Give students a useful home screen.

Possible widgets:

```text
Recent Courses
Continue Studying
Upcoming Tasks
Incomplete Modules
Recent Notes
Recent Recordings
AI Actions
```

## Development Steps

- [x] Create dashboard. (A customizable widget board: 21 widgets, drag to arrange and resize, your own lists and counts. See features/widgets/34-dashboard-widgets.md.)
- [x] Add recent pages. (By last opened; `page.opened_at`, migration 23.)
- [x] Add recent courses.
- [x] Add pinned courses.
- [x] Add incomplete modules. (With pages done out of total.)
- [x] Add quick AI actions. (Run on your last page: it opens and the action starts.)

---

# 37. Phase 35 — Tasks and Exercises

## Goal

Track work detected from modules.

A task may come from:

```text
Exercise
Discussion
Assignment
Quiz
Personal Task
```

## Development Steps

- [ ] Create Task table.
- [ ] Add task title.
- [ ] Add type.
- [ ] Add course.
- [ ] Add module.
- [ ] Add due date.
- [ ] Add completion state.
- [ ] Create task manually.
- [ ] Generate task from imported LMS item.
- [ ] Mark complete.
- [ ] Show tasks on dashboard.

---

# 38. Phase 36 — Automatic Task Extraction

Example module:

```text
Module 3

Lecture
Discussion 1
Exercise 2
Assignment
```

AI could automatically create:

```text
☐ Discussion 1
☐ Exercise 2
☐ Assignment
```

## Development Steps

- [ ] Detect task candidates.
- [ ] Show task preview.
- [ ] Ask user which tasks to create.
- [ ] Detect due dates.
- [ ] Link tasks to source page.

---

# 39. Phase 37 — Flashcards

## Development Steps

- [ ] Create Flashcard model.
- [ ] Create front/back card.
- [ ] Create flashcards manually.
- [ ] Generate flashcards with AI.
- [ ] Generate cards from current page.
- [ ] Generate cards from entire module.
- [ ] Review flashcards.
- [ ] Track correct/incorrect answers.

Later:

- [ ] Spaced repetition.

---

# 40. Phase 38 — AI Quiz

## Development Steps

- [ ] Generate multiple-choice questions.
- [ ] Generate true/false questions.
- [ ] Generate short-answer questions.
- [ ] Hide answers initially.
- [ ] Submit response.
- [ ] Show explanation.
- [ ] Track score.
- [ ] Generate quiz from page.
- [ ] Generate quiz from module.

---

# 41. Phase 39 — Study Mode

## Goal

Turn existing content into an interactive revision session.

Example:

```text
Module 4 Study Session

Summary
   ↓
Flashcards
   ↓
Quiz
   ↓
Weak Areas
   ↓
Recommended Review
```

## Development Steps

- [ ] Select module.
- [ ] Generate study session.
- [ ] Show summary.
- [ ] Start flashcards.
- [ ] Start quiz.
- [ ] Record results.
- [ ] Identify weak topics.

---

# 42. Phase 40 — Import Entire Module

Final import experience:

```text
Paste Module Link
       ↓
Open Authenticated Page
       ↓
Detect Module Structure
       ↓
Extract Content
       ↓
Find Activities
       ↓
Find Exercises
       ↓
Find Discussions
       ↓
Find Resources
       ↓
Preview Structure
       ↓
User Approves
       ↓
Create Module
       ↓
Create Pages
       ↓
Download Resources
       ↓
Ready to Study
```

---

# 43. Phase 41 — AI "Prepare Module"

This should eventually become one of the application's signature features.

User clicks:

```text
✨ Prepare Module
```

The agent:

```text
Read Module
      ↓
Read Pages
      ↓
Read Attachments
      ↓
OCR Images
      ↓
Read Transcripts
      ↓
Identify Important Topics
      ↓
Identify Tasks
      ↓
Generate Summary
      ↓
Generate Revision Notes
      ↓
Generate Flashcards
      ↓
Generate Quiz
```

User receives:

```text
Module 4
│
├── Original Material
├── Exercises
├── Discussions
├── Summary
├── Revision Notes
├── Flashcards
└── Practice Quiz
```

---

# 44. Phase 42 — Import Anything

Eventually the application should not depend entirely on LMS content.

Users should be able to import:

```text
LMS Page
Website
Article
PDF
Image
Screenshot
Audio
Lecture Recording
Markdown
Plain Text
```

Everything becomes learning material inside the same workspace.

---

# 45. Phase 43 — Record Computer Audio

## Goal

Record what the laptop plays (an online lecture, a video call, a video),
not only the room, and choose the source each time:

```text
Microphone
Computer audio
Both (mixed into one recording)
```

> **Done — 4 October 2026.** Built on chain-sdk's `audioRecorder`
> (requests 32–35) and run through its manual test plan in the app; see
> [Recording sources](features/recording-sources.md).

## Development Steps

- [x] Native capture of computer audio (chain-sdk, request 32).
- [x] Choose the source: Microphone, Computer audio, or Both.
- [x] Mix the microphone and computer audio into one recording.
- [x] Remember the last source chosen.
- [x] Offer it on Home's recorder and on a page's recording block.
- [x] Explain how to allow computer-audio access when it's refused.
- [x] Cancel the speakers' echo when recording both (chain-sdk, request 33). (SpeexDSP; passed chain-sdk's live test on laptop speakers.)
- [x] Setting to turn echo cancellation on or off. (Settings → General → Recordings → Reduce echo when recording both; on by default.)
- [x] Suggest headphones when recording both without echo cancellation. (A hint under the source picker.)
- [x] Settings to reduce background noise and even out voice volume (chain-sdk, request 34). (Settings → General → Recordings; both off by default.)
- [x] Record from the laptop's mic, not a Bluetooth headset's, and warn when a headset mic is in use (chain-sdk, request 35). (Microphone: Automatic or a chosen one.)
- [x] Change sound settings from the recorder too. (A Sound settings button beside the source picker.)

---

# 46. Recommended MVP

Do not build everything immediately.

The first usable version should only contain:

```text
1. Electron Application
2. Sidebar Layout
3. SQLite Database
4. Courses
5. Modules
6. Pages
7. Rich Text Editor
8. Autosave
9. Image Import
10. Basic LMS Page Import
11. Basic AI Chat
12. Summarize Page
13. Custom AI Action
```

At this point the application will already be useful.

---

# 47. Second Release

Add:

```text
Audio Recording
Speech-to-Text
Text-to-Speech
OCR
PDF Import
Task Extraction
AI Context Builder
Module Summaries
```

---

# 48. Third Release

Add:

```text
Agent Mode
Agent Tools
Agent Permissions
Prepare Module
Flashcards
Quiz Generation
Study Mode
Semantic Search
```

---

# 49. Development Rule for Working With an AI Agent

Avoid prompts such as:

```text
Build the course system.
```

Instead give the agent one small responsibility.

Example:

```text
Create the SQLite Course table.

Fields:
- id
- name
- description
- icon
- color
- createdAt
- updatedAt

Do not build the UI yet.

Add the migration and verify that a course can be
created and retrieved.
```

Then the next task:

```text
Create a Course repository with:

createCourse()
getCourse()
getCourses()
updateCourse()
deleteCourse()

Do not modify the UI.
```

Then:

```text
Create the Create Course modal.

Use the existing Course repository.

Fields:
- Name
- Description
- Icon
- Colour

Do not add editing or deletion yet.
```

This keeps development predictable and makes debugging much easier.

---

# 50. One Feature at a Time Rule

For every feature use this order:

```text
1. Define requirement
      ↓
2. Define data model
      ↓
3. Build backend/service
      ↓
4. Test service
      ↓
5. Build UI
      ↓
6. Connect UI
      ↓
7. Test feature
      ↓
8. Commit
```

Avoid asking the agent to change unrelated parts of the application.

---

# 51. Suggested Git Strategy

Keep commits small.

Example:

```text
feat: initialize electron-vite project

feat: add application shell

feat: add sqlite database

feat: add course model

feat: add course repository

feat: add course sidebar

feat: add module model

feat: add module management

feat: add page editor

feat: add editor autosave

feat: add image attachments

feat: add ai provider interface

feat: add summarize action
```

This makes it much easier to reverse AI-generated changes when something breaks.

---

# 52. Core Product Vision

The application should eventually provide this workflow:

```text
CAPTURE
   ↓
LMS / PDF / Image / Audio / Web

ORGANIZE
   ↓
Course → Module → Page

UNDERSTAND
   ↓
OCR / Transcription / AI

LEARN
   ↓
Notes / Summary / TTS / Flashcards / Quiz

ACT
   ↓
AI Agent + Custom AI Actions
```

The goal is not simply to create another note-taking application.

The goal is to create a learning workspace where the student can bring learning material from anywhere, organize it naturally, and give an AI agent enough structured context to understand and work with that material immediately.