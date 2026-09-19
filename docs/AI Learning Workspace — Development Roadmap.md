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
> Next up per the MVP order is **Phase 19 (Basic AI Integration)** —
> blocked on two capabilities chain-sdk doesn't have yet: outbound HTTP
> `POST` (today's `http` capability is GET-only) and secure secret
> storage for an API key (today's `storage` is unencrypted SQLite, so a
> raw column would also leak into `Backup.tsx`'s export). Written up as
> `docs/chain-sdk-requests/07-http-post.md` and
> `08-secure-secret-storage.md`.


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

Get a clean Electron application running before adding real features.

## Development Steps

- [ ] Create a new Electron Vite project.
- [x] Select React.
- [x] Enable TypeScript.
- [x] Install Tailwind CSS.
- [x] Create the basic application folder structure.
- [ ] Remove default Electron Vite demo content.
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
- [ ] Add an optional right AI sidebar.
- [x] Add a top navigation/header.
- [ ] Make the sidebar collapsible.
- [ ] Make the AI panel collapsible.
- [ ] Store sidebar state locally.
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
- [ ] Add the ORM.
- [x] Create database initialization.
- [x] Create database migrations.
- [x] Create a Course table.
- [x] Create a Module table.
- [x] Create a Page table.
- [x] Create an Attachment table.
- [x] Create an AI Action table.
- [x] Create a Settings table.
- [x] Create timestamps for records.
- [ ] Add soft delete support if needed.
- [ ] Test creating records.
- [ ] Test updating records.
- [ ] Test deleting records.
- [ ] Test retrieving records after restarting the app.

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
- [ ] Add course cover.
- [x] Add course colour.
- [x] Save the course.
- [x] Display courses in the sidebar.
- [x] Open a course.
- [x] Edit a course.
- [x] Delete a course.
- [ ] Reorder courses.
- [ ] Add favourite/pinned courses.

Later:

- [ ] Add semester.
- [ ] Add university/school.
- [ ] Add instructor.
- [ ] Add course code.

---

# 7. Phase 5 — Module Management

## Goal

Allow each course to contain modules.

## Development Steps

- [x] Create a module.
- [x] Assign the module to a course.
- [x] Rename a module.
- [x] Delete a module.
- [ ] Reorder modules.
- [ ] Collapse modules.
- [ ] Expand modules.
- [ ] Add module icons.
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
- [ ] Duplicate a page.
- [ ] Move a page.
- [ ] Reorder pages.
- [ ] Add page icons.
- [ ] Add page covers.
- [x] Add page type.
- [ ] Add page status.

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
- [ ] Add checklists.
- [x] Add blockquotes.
- [x] Add code blocks.
- [x] Add inline code.
- [x] Add hyperlinks.

## Advanced Editor

- [ ] Add tables.
- [ ] Add images.
- [ ] Add file attachments.
- [ ] Add horizontal separators.
- [ ] Add callouts.
- [ ] Add collapsible sections.
- [ ] Add embedded videos.
- [ ] Add audio blocks.
- [ ] Add custom AI blocks.

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
- [ ] Create command categories.
- [ ] Allow AI commands later.

---

# 11. Phase 9 — Drag and Drop

## Goal

Make organizing courses and notes easy.

## Development Steps

- [ ] Reorder courses.
- [ ] Reorder modules.
- [ ] Reorder pages.
- [ ] Move pages between modules.
- [ ] Drag files into pages.
- [ ] Drag images into pages.
- [ ] Drag audio into pages.

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
- [ ] Extract exercise names.
- [ ] Extract discussion names.
- [ ] Extract assignment names.

> The last three were tied to the multi-item split below, which real
> testing showed was the wrong shape (see next note) — a single imported
> page's type is still guessed from its title (`detectType` in
> `lms-import.ts`), but there's no per-item name extraction inside one
> page's content anymore.

## Import Preview

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

- [ ] ~~Show detected items.~~ (superseded — see note above)
- [ ] ~~Allow users to uncheck items.~~ (superseded)
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

## Development Steps

- [ ] Create an LMS browser window.
- [ ] Allow the user to log in normally.
- [ ] Store session cookies securely.
- [ ] Detect the current LMS page.
- [ ] Add "Import Current Page".
- [ ] Read permitted page content.
- [ ] Send page content into the importer.
- [ ] Keep login credentials out of the application's database.

---

# 14. Phase 12 — Smart Content Detection

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

- [ ] Create rule-based content detection.
- [ ] Detect common heading patterns.
- [ ] Detect numbered activities.
- [ ] Detect "Discussion".
- [ ] Detect "Exercise".
- [ ] Detect "Assignment".
- [ ] Detect "Quiz".
- [ ] Detect due dates.
- [ ] Detect downloadable files.
- [ ] Add AI classification as a later fallback.

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
- [ ] Store attachment metadata.
- [ ] Store local file location.
- [ ] Display attachments.
- [ ] Open attachments.
- [ ] Remove attachments.
- [ ] Rename attachments.

---

# 16. Phase 14 — Image Support

## Goal

Allow screenshots, slides, diagrams, and textbook pages to be stored and analysed.

## Development Steps

- [ ] Upload image.
- [ ] Paste image from clipboard.
- [ ] Drag image into editor.
- [ ] Resize images.
- [ ] Add image captions.
- [ ] Open full image.
- [ ] Add "Extract Text".
- [ ] Add "Explain Image".
- [ ] Add "Summarize Image".
- [ ] Add "Insert Extracted Text".

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

- [ ] Create OCR service interface.
- [ ] Send image to OCR.
- [ ] Receive extracted text.
- [ ] Show OCR preview.
- [ ] Allow user corrections.
- [ ] Insert extracted text below image.
- [ ] Replace image with extracted text if requested.
- [ ] Send extracted text to AI.

---

# 18. Phase 16 — Audio Recording

## Goal

Allow users to record lectures, explanations, or personal notes.

## Development Steps

- [ ] Request microphone permission.
- [ ] Add Record button.
- [ ] Add Pause button.
- [ ] Add Resume button.
- [ ] Add Stop button.
- [ ] Show recording duration.
- [ ] Save recording locally.
- [ ] Rename recording.
- [ ] Attach recording to page.
- [ ] Play recording.
- [ ] Seek through recording.
- [ ] Delete recording.

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

- [ ] Create transcription service interface.
- [ ] Select recording.
- [ ] Send recording for transcription.
- [ ] Display progress.
- [ ] Save raw transcript.
- [ ] Allow transcript editing.
- [ ] Insert transcript into page.
- [ ] Add "Clean Transcript".
- [ ] Add "Summarize Transcript".

---

# 20. Phase 18 — Text-to-Speech

## Goal

Allow students to listen to learning material.

## Development Steps

- [ ] Select text.
- [ ] Add "Read Aloud".
- [ ] Add Play.
- [ ] Add Pause.
- [ ] Add Stop.
- [ ] Add playback speed.
- [ ] Add voice selection.
- [ ] Add language selection.
- [ ] Add "Read Entire Page".
- [ ] Add "Read Module Summary".

---

# 21. Phase 19 — Basic AI Integration

## Goal

Connect an AI model to the workspace.

Start simple.

## Development Steps

- [ ] Create an AI provider interface.
- [ ] Add API key settings.
- [ ] Store keys securely.
- [ ] Test basic AI request.
- [ ] Add AI sidebar.
- [ ] Add message input.
- [ ] Send current page content.
- [ ] Display AI response.
- [ ] Add Markdown response rendering.
- [ ] Add loading state.
- [ ] Add error handling.
- [ ] Add cancel generation.

Do not start with agents yet.

First make basic AI communication reliable.

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

- [ ] Create AI Action model.
- [ ] Add default actions.
- [ ] Add action toolbar.
- [ ] Allow actions on selected text.
- [ ] Allow actions on current page.
- [ ] Allow actions on current module.
- [ ] Show generation progress.
- [ ] Show result preview.
- [ ] Allow insertion into document.
- [ ] Allow replacement of selected text.

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

- [ ] Create "New AI Action".
- [ ] Add action name.
- [ ] Add action icon.
- [ ] Add custom prompt.
- [ ] Select context sources.
- [ ] Select output mode.
- [ ] Save action.
- [ ] Edit action.
- [ ] Delete action.
- [ ] Duplicate action.
- [ ] Reorder actions.
- [ ] Display custom action in toolbar.

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

- [ ] Create AI Profile model.
- [ ] Create profile editor.
- [ ] Save system instructions.
- [ ] Select active profile.
- [ ] Add course-specific profiles.
- [ ] Add default profile.
- [ ] Include active profile in context builder.

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

- [ ] Insert AI output below cursor.
- [ ] Replace selected text.
- [ ] Append content to page.
- [ ] Generate heading + content.
- [ ] Generate editor blocks.
- [ ] Create page from AI result.
- [ ] Create child page.
- [ ] Add undo support.

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

### Tool 1 — Read Page

- [ ] Define input schema.
- [ ] Retrieve page.
- [ ] Return page content.
- [ ] Test manually.
- [ ] Allow AI to call it.

### Tool 2 — Search Workspace

- [ ] Define search input.
- [ ] Search page titles.
- [ ] Search page content.
- [ ] Return matching pages.
- [ ] Allow AI to call it.

### Tool 3 — Create Page

- [ ] Define input.
- [ ] Validate destination.
- [ ] Create page.
- [ ] Return page ID.
- [ ] Allow AI to call it.

Repeat this pattern for every tool.

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

## Development Steps

- [ ] Create agent execution loop.
- [ ] Allow tool calls.
- [ ] Store execution history.
- [ ] Display current agent action.
- [ ] Display completed actions.
- [ ] Add Stop button.
- [ ] Add maximum tool-call limit.
- [ ] Prevent infinite loops.
- [ ] Add error recovery.
- [ ] Add user approval system.

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

## Development Steps

- [ ] Add Ask mode.
- [ ] Add Agent mode.
- [ ] Show active mode clearly.
- [ ] Restrict tool permissions based on mode.
- [ ] Require confirmation for destructive operations.

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

## Development Steps

- [ ] Define permissions.
- [ ] Categorize AI tools.
- [ ] Add approval dialog.
- [ ] Save trusted permissions.
- [ ] Always confirm deletion.
- [ ] Create agent activity log.

---

# 31. Phase 29 — AI Action Packs

## Goal

Bundle useful AI actions together.

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

- [ ] Create Action Pack format.
- [ ] Install pack.
- [ ] Remove pack.
- [ ] Enable/disable individual actions.
- [ ] Export pack.
- [ ] Import pack.

---

# 32. Phase 30 — Search

## Goal

Allow users and AI to find anything quickly.

## Development Steps

- [ ] Search courses.
- [ ] Search modules.
- [ ] Search page titles.
- [ ] Search page content.
- [ ] Search transcripts.
- [ ] Search attachments.
- [ ] Add keyboard shortcut.
- [ ] Highlight search results.
- [ ] Open result directly.

Later:

- [ ] Semantic search.
- [ ] Vector embeddings.
- [ ] AI search.

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

- [ ] Build command palette UI.
- [ ] Add keyboard shortcut.
- [ ] Search commands.
- [ ] Execute commands.
- [ ] Add recent commands.

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

- [ ] Create shortcut manager.
- [ ] Add default shortcuts.
- [ ] Detect shortcut conflicts.
- [ ] Allow customization.
- [ ] Save preferences.

---

# 35. Phase 33 — Customization

## Workspace Customization

- [ ] Light mode.
- [ ] Dark mode.
- [ ] Custom accent colour.
- [ ] Sidebar width.
- [ ] Editor width.
- [ ] Font selection.
- [ ] Font size.
- [ ] Compact mode.

## Course Customization

- [ ] Icons.
- [ ] Covers.
- [ ] Colours.
- [ ] Custom module icons.
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

- [ ] Create dashboard.
- [ ] Add recent pages.
- [ ] Add recent courses.
- [ ] Add pinned courses.
- [ ] Add incomplete modules.
- [ ] Add quick AI actions.

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

# 45. Recommended MVP

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

# 46. Second Release

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

# 47. Third Release

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

# 48. Development Rule for Working With an AI Agent

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

# 49. One Feature at a Time Rule

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

# 50. Suggested Git Strategy

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

# 51. Core Product Vision

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