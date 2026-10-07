# Phase 29 — AI Action Packs

Source: `AI Learning Workspace — Development Roadmap.md`, Phase 29. Builds
on custom AI actions (`22-custom-ai-actions.md`), whose `ai_action` table,
form, menu and runner this reuses. No chain-sdk capability needed:
`desktop.files.save` and `pickFiles` already cover export and import.

## Status — 3 October 2026

**Implemented.** Typecheck and the migration test pass. Exercised in the
running app: browsing and searching the catalogue, installing
Mathematics, turning an action off (hidden from the menu, `enabled = 0`
in the database), the menu grouping by pack, a pack exported to text and
imported back (the edited prompt survived, installed as "Mathematics
(2)"), and removing both packs through the confirmation dialog. The
native save and open panels for **Export** and **Import pack**, and the
guided tour, were then checked by the user in the app on 3 October.

**Changed from the plan:**

- **Not in backups.** Backups don't include `ai_action` at all today, so
  packs and the on/off state aren't added either. Export a pack to keep
  it.
- Foreign keys aren't enforced in this app, so `action_pack_delete`, a
  trigger, deletes a pack's actions (the same approach as
  `agent_conversation_delete`).
- Study Essentials uses the `cards` icon, not `study`.
- An exported pack doesn't carry the on/off state. Imported actions
  start on.

## Goal

Let the user add a ready-made set of AI actions for what they study, in
one step, and share their own sets. The roadmap's examples are
Programming, Lecture and Research; mneme is for every student, so the
built-in catalogue covers as many subjects as possible (28 packs across
11 areas, below), not just software.

## In scope

- **Pack format**: a JSON file with a name, description, area and
  a list of actions (the same fields as the action form).
- **Browse packs** (Settings → AI actions → **Browse packs**): the
  built-in catalogue, filterable by area and searchable by name. Each
  pack shows its description and its actions before installing.
- **Install pack**: copies its actions into `ai_action`, linked to the
  pack. A pack can be installed once; installed packs show
  **Installed** in the catalogue.
- **Remove pack**: deletes the pack and its actions, after a
  confirmation naming how many actions go with it. Hard delete: actions
  aren't courses, modules or pages, so there's no Recently deleted.
- **Turn individual actions on or off**: a switch on every action in
  Settings, pack or not. Off actions stay in Settings and drop out of
  the menu.
- **Export pack**: saves an installed pack, as it is now (including the
  user's edits), as `<pack-name>.mneme-pack.json`. **Export my
  actions** does the same for the actions that aren't in any pack.
- **Import pack**: picks a `.json` file, shows the pack and its actions,
  and installs it on **Install pack**.
- **Menu**: actions not in a pack first, as today; then one group per
  installed pack, headed by its name, in install order. Wide-scope tags
  ("Module"/"Course") stay.

- **Guided tour** (`shared/ui/Tour.tsx`, reusable): highlights the real
  controls one at a time with a card and Next / Back / Skip tour.
  Browse packs, an installed pack, the on/off checkbox, Export my
  actions, Import pack (what a `.mneme-pack.json` file is), and the
  "Show me how" link. Starts once, on the first visit to Settings → AI
  actions (`claimSetting("tour.ai-actions")`), and replays from **Show me
  how**. Steps whose control isn't on screen (no pack installed yet) are
  skipped. Escape closes it.
- **Import pack** opens a dialog explaining pack files before **Choose
  file**, then lists the pack's actions before **Install pack**.

## Explicitly out of scope

- Updating an installed built-in pack when the catalogue changes. The
  catalogue is versioned in the file format so this can come later;
  until then, remove and reinstall.
- A pack store or downloading packs from the internet. Import is from a
  file only.
- Per-pack agent or AI profile. The menu's "Run with" and the course's
  profile still apply to every action.
- Moving the 9 default actions into a pack. They stay standalone.

## Data model

Migration `0031-action-packs` (as planned; the generated SQL also adds
the `action_pack_delete` trigger):

```sql
CREATE TABLE action_pack (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  catalog_key TEXT UNIQUE,           -- built-in pack key, NULL for imported packs
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  area INTEGER,                      -- PackArea, NULL for imported packs without one
  position INTEGER NOT NULL DEFAULT 0,
  installed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE ai_action ADD COLUMN pack_id INTEGER
  REFERENCES action_pack(id) ON DELETE CASCADE;
ALTER TABLE ai_action ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1;
```

Written as `@Table` classes in `db/schema/action-pack.ts` and
`ai-action.ts`, then `chain migration add action-packs` (migration
`0031-action-packs`).

- `position` on `ai_action` stays global; the menu groups by pack, then
  orders by position inside each group.
- Editing a pack's action keeps it in the pack. **Duplicate** makes a
  standalone copy.

## File format

Enums are written as words, not numbers, so files stay readable and
don't depend on mneme's column values:

```json
{
  "format": "mneme-action-pack",
  "version": 1,
  "name": "Mathematics",
  "description": "Work through proofs, problems and formulas.",
  "area": "maths-data",
  "actions": [
    {
      "name": "Solve step by step",
      "icon": "calculator",
      "prompt": "…",
      "scope": "page",
      "output": "preview",
      "pageTypes": null
    }
  ]
}
```

Import validation (`readPackFile`), each failure with its own message:

- Not JSON, or `format` isn't `mneme-action-pack`: "This file isn't a
  mneme action pack."
- `version` higher than mneme knows: "This pack needs a newer version
  of mneme."
- No actions, an action without a name or prompt, or more than 50
  actions: the message names the problem and the action.
- Unknown icon → no icon. Unknown page type → dropped. Unknown scope or
  output → the defaults (page, preview).
- A pack with the same name already installed: installed as
  "<name> (2)".

## Built-in catalogue

`features/ai-actions/lib/pack/catalog.ts`, in the same shape as an imported pack, so
built-in and imported packs install through the same function.

Every prompt is only the task, like the defaults: the content, the
"reply in Markdown" framing and the AI profile are added at run time.
Prompts that touch health, law or money ask the agent to say when a
current official source or a professional should be checked. Where the
user's profile asks for hints on assessed questions, the
problem-solving actions follow it; the profile already says so.

Key: _Runs on_ — **Page** (selection or page), **Module**, **Course**.
_Result_ — **Preview**, **Insert** (insert below), **New page**.

New icons (added to `ActionIcon`'s fixed set, one simple stroke path
each): `calculator`, `flask`, `leaf`, `heart`, `code`, `chart`,
`scales`, `landmark`, `quote`, `music`, `palette`, `briefcase`,
`question`, `cards`, `mic`, `pencil`.

### Study skills

**Study Essentials** (`study`)

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Create flashcards | Page | Preview | Turn this content into question-and-answer flashcards, one fact per card, as a two-column table (Front, Back). |
| Create practice quiz | Page | Preview | Write 10 multiple-choice questions on this content, mixing recall and understanding, with an answer key and a one-line reason for each answer at the end. |
| Make a study plan | Module | New page | Make a study plan for this module: split the material into short sessions, put the hardest topics early, and add a review session for each topic two days and a week later. |
| Explain like I'm new | Page | Preview | Explain this content to someone with no background in the subject, using an everyday analogy, then restate it once more precisely. |
| Find gaps in my notes | Page | Preview | Read these notes and list what seems missing, unclear or possibly wrong, with a question I could ask or look up for each. |
| Make a mind map | Page | Insert | Turn this content into a mind map as a nested bulleted list: the main idea at the top, then branches and sub-branches. |

**Lecture** (`mic`) — from the roadmap.

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Create lecture notes | Page | New page | Turn this lecture transcript into structured notes with headings for each topic, key points, examples the lecturer gave, and anything they stressed as important or examinable. |
| Extract definitions | Page | Preview | List every term this lecture defines or relies on, with a short definition of each in the lecturer's sense. |
| Find what will be assessed | Page | Preview | List everything in this lecture the lecturer mentioned as assessed, important, or likely to come up, with the words they used. |
| Create revision sheet | Module | New page | Make a one-page revision sheet for these lectures: the key ideas, formulas or dates, definitions, and the links between topics. |
| Questions to ask | Page | Preview | List questions a student could ask the lecturer or tutor about this lecture, focusing on the parts that are skipped quickly or left unclear. |

**Exam Prep** (`checklist`)

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Predict exam questions | Course | New page | From this course content, write the questions most likely to appear in an exam, grouped by topic, and mark which are short-answer and which are essay or long-answer. |
| Mock exam | Module | New page | Write a mock exam on this module: a mix of short-answer and longer questions with marks for each, and a separate marking guide at the end. |
| Mark my answer | Page | Preview | This page contains a question and my answer. Mark my answer as an examiner would: what earns marks, what's missing, and how to improve it. Don't rewrite the answer for me. |
| Last-minute summary | Course | New page | Write a last-minute review of this course: only the most important ideas, formulas, definitions and common mistakes, in under two pages. |
| Common mistakes | Page | Preview | List the mistakes and misconceptions students commonly have about this topic, and the correct idea for each. |

### Mathematics and data

**Mathematics** (`calculator`)

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Solve step by step | Page | Preview | Solve this problem step by step, saying which rule or theorem each step uses. Write formulas in plain text. |
| Explain this proof | Page | Preview | Explain this proof line by line: what each step does, why it's allowed, and the overall strategy. |
| Similar practice problems | Page | Preview | Write 5 problems like this one, from easier to harder, with answers at the end. |
| Check my working | Page | Preview | Check my working on this problem. Point to the first line that is wrong, if any, and explain why, without solving the rest for me. |
| Formula sheet | Module | New page | Collect every formula, theorem and identity in this module into a formula sheet, each with what its symbols mean and when to use it. |
| Explain the intuition | Page | Preview | Explain the intuition behind this concept: what it means geometrically or in the real world, before the formal definition. |

**Statistics and Data** (`chart`)

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Which test should I use? | Page | Preview | For the data and question described here, say which statistical test or method fits, why, what its assumptions are, and what would change the choice. |
| Interpret these results | Page | Preview | Interpret these statistical results in plain language: what they show, what they don't, and how confident we can be. |
| Spot the flaws | Page | Preview | Look for problems in how this data was collected, analysed or presented: bias, confounders, misleading charts, or conclusions the data doesn't support. |
| Explain the method | Page | Preview | Explain this statistical method: what it does, when to use it, its assumptions, and a small worked example. |
| Worked example | Page | Preview | Make up a small data set and work through this method on it, step by step. |

### Natural sciences

**Physics** (`sparkle`)

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Solve with units | Page | Preview | Solve this physics problem step by step: list the knowns, choose the principle, carry units through every step, and check the answer's size makes sense. |
| Explain the principle | Page | Preview | Explain the physical principle here, with an everyday example and the equation that describes it. |
| Derive the equation | Page | Preview | Derive this equation from first principles, stating each assumption. |
| Practice problems | Page | Preview | Write 5 physics problems on this topic, from easier to harder, with answers at the end. |
| Equation sheet | Module | New page | List every equation in this module with its symbols, units, and when it applies. |

**Chemistry** (`flask`)

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Explain the reaction | Page | Preview | Explain this reaction: reactants, products, type of reaction, mechanism where relevant, and why it happens. |
| Balance and calculate | Page | Preview | Balance the equations here and work through any stoichiometry step by step, with units. |
| Compare compounds | Page | Preview | Compare the compounds or elements mentioned here in a table of properties, structure and uses. |
| Lab report outline | Page | New page | Turn these lab notes into a lab report outline: aim, method, results, discussion points and safety notes. |
| Key reactions list | Module | New page | List every reaction in this module with its equation, conditions and type. |

**Biology** (`leaf`)

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Explain the process | Page | Preview | Explain this biological process as numbered stages: what happens, where, and why it matters. |
| Structure and function | Page | Preview | For each structure mentioned here, explain what it is and how its structure suits its function. |
| Compare and contrast | Page | Preview | Compare the organisms, cells or processes here in a table of similarities and differences. |
| Label-the-diagram quiz | Page | Preview | Write a quiz describing the parts of the structures here, asking me to name each one, with answers at the end. |
| Key terms | Module | New page | List every biological term in this module with a short definition and an example. |

**Earth and Environment** (`leaf`)

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Explain the system | Page | Preview | Explain this Earth or environmental system: its parts, the flows between them, and what disturbs it. |
| Causes and effects | Page | Preview | Map the causes and effects in this content as a chain, separating natural and human causes. |
| Case study summary | Page | Preview | Summarise this case study: location, what happened, causes, impacts on people and environment, and responses. |
| Data and maps | Page | Preview | Explain how to read the data, maps or figures described here, and what they show. |
| Sustainability angles | Page | Preview | Discuss the sustainability issues here from environmental, economic and social points of view. |

### Health

**Medicine and Nursing** (`heart`)

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Condition summary | Page | Preview | Summarise this condition for study: cause, pathophysiology, signs and symptoms, diagnosis, treatment, and complications. Say that current clinical guidelines should be checked. |
| Drug card | Page | Preview | Make a study card for each drug here: class, mechanism, uses, main side effects, contraindications and monitoring. Say that doses must be checked in a current formulary. |
| Clinical case questions | Page | Preview | Write a short clinical case based on this content, with questions on assessment, diagnosis and management, and answers at the end. |
| Mnemonics | Page | Preview | Suggest memorable mnemonics for the lists and sequences in this content, and what each letter stands for. |
| Anatomy breakdown | Page | Preview | Break down this anatomy: location, structure, blood and nerve supply, function, and clinical relevance. |

**Psychology** (`idea`)

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Theory summary | Page | Preview | Summarise this psychological theory: who proposed it, its main claims, the evidence for it, and its criticisms. |
| Study evaluation | Page | Preview | Evaluate this study: aim, method, sample, findings, strengths, limitations and ethics. |
| Apply to real life | Page | Preview | Show how the ideas here apply to three everyday situations. |
| Compare approaches | Page | Preview | Compare the approaches or theories here in a table: assumptions, methods, strengths and weaknesses. |
| Key studies | Module | New page | List every study in this module with its researcher, year, method and main finding. |

### Engineering and technology

**Programming** (`code`) — from the roadmap.

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Explain code | Page | Preview | Explain this code: what it does overall, then each part, and any language features a learner may not know. |
| Find bugs | Page | Preview | Look for bugs, edge cases and mistakes in this code. For each, say where it is, what goes wrong, and how to fix it. |
| Explain the algorithm | Page | Preview | Explain this algorithm: the idea behind it, the steps, its time and space complexity, and when to use it. |
| Practice exercise | Page | Preview | Write a programming exercise that practises the concepts here, with a test case and a hidden solution at the end. |
| Simplify documentation | Page | Preview | Rewrite this documentation simply, with a short example of each feature. |

**Engineering** (`briefcase`)

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Worked calculation | Page | Preview | Work through this engineering calculation step by step: state assumptions, carry units, and check the result is reasonable. |
| Design trade-offs | Page | Preview | List the design options here and compare them on cost, safety, performance and practicality. |
| Explain the system | Page | Preview | Explain how this system or device works, component by component, and how they interact. |
| Failure analysis | Page | Preview | Discuss how this system could fail, the likely causes, and how designers prevent it. |
| Standards and units | Module | New page | List the quantities, units, constants and any standards mentioned in this module. |

### Humanities

**History** (`landmark`)

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Timeline | Module | New page | Build a timeline of the events in this content: date, event, and why it matters. |
| Causes and consequences | Page | Preview | Explain the causes of this event (long-term and immediate) and its short- and long-term consequences. |
| Analyse a source | Page | Preview | Analyse this historical source: origin, purpose, content, context, value and limitations. |
| Different interpretations | Page | Preview | Describe how historians have interpreted this topic differently, and the evidence each side uses. |
| Key people | Module | New page | List the key people in this module, who they were, and what they did that matters. |

**Literature** (`quote`)

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Analyse the passage | Page | Preview | Analyse this passage: what it says, the techniques the writer uses, and their effect on the reader, quoting short phrases as evidence. |
| Themes | Page | Preview | Identify the themes here and how the text develops each one, with evidence. |
| Character study | Page | Preview | Describe each main character: traits, motivations, how they change, and what they represent. |
| Context | Page | Preview | Explain the historical, social and literary context of this text and how it shapes the meaning. |
| Essay plan | Page | New page | Make an essay plan answering the question here: a thesis, three or four paragraphs with points and evidence, and a conclusion. |

**Philosophy** (`idea`)

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Map the argument | Page | Preview | Set out the argument here as numbered premises and a conclusion, then say whether it's valid and which premises are weakest. |
| Objections and replies | Page | Preview | Give the strongest objections to this position and how a defender might reply to each. |
| Explain the concept | Page | Preview | Explain this philosophical concept plainly, with an example and a common misunderstanding. |
| Compare thinkers | Page | Preview | Compare the philosophers or positions here on the main question they disagree about. |
| Thought experiment | Page | Preview | Explain the thought experiment here: the setup, what it's meant to show, and how people have responded. |

**Religious Studies** (`study`)

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Summarise the teaching | Page | Preview | Summarise this teaching or text neutrally: its main ideas, where it comes from, and how followers understand it. |
| Compare traditions | Page | Preview | Compare how the traditions here approach this question, respectfully and without ranking them. |
| Key terms | Module | New page | List the key terms in this module with their meaning within the tradition. |
| Ethical issue | Page | Preview | Set out the different religious and non-religious views on the ethical issue here, with their reasons. |

### Social sciences

**Economics** (`chart`)

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Explain the model | Page | Preview | Explain this economic model: its assumptions, how it works, what it predicts, and its limits. |
| Describe the diagram | Page | Preview | Describe the economic diagram here in words: the axes, curves, equilibrium, and what happens when it shifts. |
| Apply to the news | Page | Preview | Show how the ideas here apply to a realistic current situation, and what the model would predict. |
| Policy evaluation | Page | Preview | Evaluate the policy here: aims, likely effects, who gains and loses, and the evidence. |
| Practice calculations | Page | Preview | Write 5 calculation questions on this topic (elasticity, GDP, costs and so on), with answers. |

**Politics and Sociology** (`discussion`)

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Explain the theory | Page | Preview | Explain this social or political theory: its main ideas, thinkers, and criticisms. |
| Different perspectives | Page | Preview | Present how different perspectives would see this issue, fairly and with their reasons. |
| Debate prep | Page | Preview | Prepare both sides of a debate on this topic: the strongest arguments, evidence and rebuttals. |
| Case study | Page | Preview | Summarise this case study and connect it to the concepts in the course. |
| Key concepts | Module | New page | List the key concepts in this module with definitions and an example of each. |

**Law** (`scales`)

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Case brief | Page | Preview | Brief this case: facts, issue, decision, reasoning, and its significance. Say that the law should be checked for the current position in the relevant jurisdiction. |
| Apply IRAC | Page | Preview | Work through this problem question using IRAC: issue, rule, application, conclusion. This is for study, not legal advice. |
| Explain the statute | Page | Preview | Explain this statute or provision in plain language: what it requires, who it applies to, and key exceptions. |
| Arguments for both sides | Page | Preview | Set out the strongest arguments for each party on this issue. |
| Case list | Module | New page | List every case in this module with its principle in one line. |

### Business

**Business and Management** (`briefcase`)

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| SWOT analysis | Page | Preview | Do a SWOT analysis of the organisation or situation here. |
| Apply the framework | Page | Preview | Apply the business framework from this content (for example Porter's Five Forces or PESTLE) to the case here. |
| Case study answer plan | Page | New page | Plan an answer to this business case: the problem, analysis, options, recommendation and risks. |
| Key concepts | Module | New page | List the key business concepts in this module with definitions and a real company example. |
| Presentation outline | Page | New page | Turn this content into a presentation outline: one slide per main point, with speaker notes. |

**Accounting and Finance** (`calculator`)

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Work the calculation | Page | Preview | Work through this accounting or finance calculation step by step, showing each figure. |
| Explain the statement | Page | Preview | Explain this financial statement: what each section shows and what the numbers say about the organisation. |
| Ratio analysis | Page | Preview | Calculate and interpret the relevant financial ratios from the figures here. |
| Journal entries practice | Page | Preview | Write 5 transactions on this topic for me to record, with the correct entries at the end. |
| Explain the standard | Page | Preview | Explain this accounting standard or rule plainly, with an example. Say that the current standard should be checked. |

### Languages, writing and research

**Language Learning** (`translate`)

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Vocabulary list | Page | Preview | List the useful vocabulary in this text: word, meaning, part of speech and an example sentence. |
| Explain the grammar | Page | Preview | Explain the grammar points used in this text with simple rules and more examples. |
| Correct my writing | Page | Preview | Correct this text I wrote in the language I'm learning. Show each correction and briefly explain why. |
| Graded reader | Page | Preview | Rewrite this text at a simpler level for a learner, keeping the meaning. |
| Conversation practice | Page | Preview | Write a short dialogue using the vocabulary and grammar here, then questions to answer about it. |
| Pronunciation guide | Page | Preview | Give a pronunciation guide for the difficult words here, with syllable stress and sounds a learner usually gets wrong. |

**Academic Writing** (`pencil`)

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Feedback on my draft | Page | Preview | Give feedback on this draft as a tutor would: argument, structure, evidence, clarity and style, with specific suggestions. Don't rewrite it for me. |
| Strengthen the thesis | Page | Preview | Suggest how to make the thesis or main argument here clearer and more arguable, with two alternative wordings. |
| Outline an essay | Page | New page | Outline an essay on the question here: thesis, paragraph-by-paragraph points, and the evidence each needs. |
| Paraphrase practice | Page | Preview | Show how to paraphrase the key sentences here in my own words, and explain what changed and why it isn't copying. |
| Tighten the wording | Page | Preview | Point out wordy, vague or repetitive sentences here and suggest tighter versions. |

**Research** (`question`) — from the roadmap.

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Summarise the paper | Page | Preview | Summarise this paper: research question, method, findings, and limitations. |
| Extract claims | Page | Preview | List the main claims in this text and the evidence offered for each. |
| Evaluate the evidence | Page | Preview | Evaluate the evidence here: sample, method, possible bias, and how strongly it supports the conclusions. |
| Compare sources | Module | New page | Compare the sources in this module: where they agree, where they disagree, and why. |
| Literature review outline | Module | New page | Outline a literature review from these sources, grouped by theme, with the gaps they leave. |
| Format references | Page | Preview | Format the references here in APA 7, and list anything missing from each one. |

### Arts

**Music** (`music`)

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Explain the theory | Page | Preview | Explain this music theory concept with notation written in text and a familiar song as an example. |
| Analyse the piece | Page | Preview | Analyse this piece: form, harmony, melody, rhythm, texture and context. |
| Composer or period | Page | Preview | Summarise this composer, performer or period: style, key works and influence. |
| Ear-training plan | Page | Preview | Suggest listening and practice exercises for the skills in this content. |
| Terms list | Module | New page | List every musical term in this module with its meaning. |

**Art and Design** (`palette`)

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Analyse the artwork | Page | Preview | Analyse the artwork described here: subject, composition, technique, context and meaning. |
| Movement summary | Page | Preview | Summarise this art or design movement: dates, ideas, key artists and works, and what came after it. |
| Design critique | Page | Preview | Critique the design described here: hierarchy, layout, colour, type and how well it serves its purpose. |
| Project brief | Page | New page | Turn these notes into a project brief: goal, audience, constraints, references and deliverables. |
| Artist statement feedback | Page | Preview | Give feedback on this artist or design statement: clarity, specificity and voice. |

### Teaching

**Teaching** (`discussion`) — for students who tutor or train as teachers.

| Action | Runs on | Result | Prompt |
| --- | --- | --- | --- |
| Lesson plan | Page | New page | Turn this content into a lesson plan: objectives, starter, main activities, checks for understanding, and a closing task. |
| Differentiate | Page | Preview | Adapt this material for three levels: support, core and extension. |
| Discussion questions | Page | Preview | Write discussion questions on this content, from recall to open-ended. |
| Rubric | Page | Preview | Write a marking rubric for the task here with criteria and four levels. |
| Explain a misconception | Page | Preview | List misconceptions learners have about this topic and an activity to address each. |

## Code layout

- `db/schema/action-pack.ts`, `ai-action.ts`: as above.
- `features/ai-actions/lib/pack/`: `types.ts` (`PackArea`, `ActionPack`,
  `PackFile`), `table.ts`, `actions.ts` (`installPack`, `removePack`,
  `exportPack`, `exportStandaloneActions`, `readPackFile`), following
  the `lib/<entity>/` convention, plus `file.ts` for the file format.
- `features/ai-actions/lib/pack/catalog.ts`: the catalogue.
- `lib/action/actions.ts`: `setActionEnabled`.
- `components/PackBrowser.tsx` (dialog: area filter, search, pack
  details, Install), `components/PackSettings.tsx` (installed packs:
  per-action switches, Export, Remove), and the menu grouping in
  `AiActionsMenu.tsx`.
- `ActionIcon.tsx`: the new icons.

## Manual test plan

1. Browse packs lists 28 packs; the area filter and search narrow it.
   Install Mathematics: its actions appear in Settings and as a
   "Mathematics" group in the page's AI actions menu.
2. Run "Solve step by step" on a page with a problem. With a profile
   asking for hints on assessed questions, it gives hints.
3. Turn one action off: it leaves the menu, stays in Settings. Turn it
   back on.
4. Edit a pack action, export the pack, remove it (confirmation names
   the count), import the file: the edited prompt comes back.
5. Import a non-pack JSON, a pack with `version: 99`, and a pack with an
   action missing its prompt: each shows its own message and installs
   nothing.
6. Install Medicine and Law, run a module-scope action from each.
