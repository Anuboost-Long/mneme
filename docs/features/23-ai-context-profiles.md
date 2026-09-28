# Phase 23 — AI Context Profiles

Source: `AI Learning Workspace — Development Roadmap.md`, Phase 23. Builds
on agent chat (`19-agent-chat.md`) and AI actions
(`21-ai-quick-actions.md`, `22-custom-ai-actions.md`). No chain-sdk
capability needed: it's a local table plus text added to prompts.

## Status — 27 September 2026

**Implemented.** Typecheck, web build and the migration test pass. Not
yet exercised in the running app or against a live agent.

**Changed after first build (27 September):** free-text instructions
were replaced by fixed settings (migration `0014-ai-profile-settings`).
Free text stacked a second, unpredictable prompt on top of every AI
action's own prompt: a profile like "only give clues" turned "Translate"
or "Extract tasks" into hints. Now each setting sends one known
sentence (`ai-profiles/lib/preferences.ts`), worded as a preference about
*how* to write, and the framing states that the action's task wins on
conflict. Existing profiles keep their name with every setting at "no
preference".

## Settings

- **Language:** no preference, or a fixed list (English: Australian,
  British or American; Khmer; Chinese; Vietnamese; Thai; Japanese;
  Korean; French; Spanish). "…unless the task asks for another language".
- **Explanation level:** no preference / Beginner / Some background /
  Advanced.
- **Tone:** no preference / Friendly / Formal.
- **Length:** no preference / Concise / Detailed.
- **Checkboxes:** Keep technical terms; Use examples; Hints instead of
  answers to assessed questions (only for answering assignment, quiz
  or exam questions, never for summarising, translating or organising).

A profile with nothing set sends nothing.

## Goal

Let the user set how the agent writes for them (language, explanation
level, "hints, not answers, for assessed questions") once, for every
chat and AI action.

## What's built

- **Settings → AI profiles:** list, **New profile**, **Edit**,
  **Delete**, and **Make default** / **Remove as default**. At most one
  profile is the default. Having no default is allowed and means no
  profile applies.
- **Course details → AI profile:** "Use the default profile" or any
  profile. Only shown once at least one profile exists.
- **Switching where you work, not in Settings:**
  - **AI actions menu → "Profile for this course"** under "Run with":
    "Default (<name>)" or any profile. Changes the course's profile
    straight away (the same field as in the course's details).
  - **Agent chat header → "Default AI profile"**: "None" or any
    profile. Changes the default, which chat uses.
  - With no profiles yet, both show a "Create one" link to Settings →
    AI profiles. Settings stays the place to write and edit profiles.
  - Shared component: `ai-profiles/components/ProfilePicker.tsx`. The
    page route saves the course and updates the cached course list, so
    the course form doesn't show a stale value afterwards.
- **Which profile applies:**
  - AI actions: the page's course profile if it has one, otherwise the
    default.
  - Chat: the default. Conversations aren't tied to a course.
- **How it's sent, to every agent:**
  - Claude and Codex: appended to the framing instructions they already
    receive (Claude's `--append-system-prompt`, Codex's message prefix).
  - Gemini, Copilot, Cursor and custom agents: they get nothing but the
    message, so the profile goes at its start, worded as the user
    ("My writing preferences, from my … AI profile", with "my request below … wins if they conflict"). mneme's
    own framing still isn't sent to them. The profile is the user's own
    choice, so it doesn't break the "literal pass-through" rule. Chat
    history stores only what the user typed.
  - Chosen in one place: `buildArgs()` in `runTurn.ts`, using the
    invoker's `takesFraming` flag.

## Data model

Migration `0013-ai-profiles`:

```sql
CREATE TABLE ai_profile (id, name, instructions, created_at, updated_at);  -- instructions replaced in 0014
ALTER TABLE course ADD COLUMN ai_profile_id INTEGER REFERENCES ai_profile(id) ON DELETE SET NULL;
```

The default profile's id lives in `settings` under
`ai-profiles.default-id`, like `ai-actions.connection-id`. Deleting a
profile clears both references explicitly, rather than relying on SQLite
foreign-key enforcement.

## Code layout

- `features/ai-profiles/lib/profiles.ts`: queries, `getActiveProfile(courseId?)`,
  `withProfile(framing, profile)`.
- `features/ai-profiles/components/ProfileSettings.tsx`, `ProfileForm.tsx`.
- `agent-chat/lib/runTurn.ts`: chat framing includes the default profile.
- `ai-actions/lib/useAiAction.ts` / `runAction.ts`: resolve the course's
  profile and add it to the action's framing.
- `courses/components/CourseForm.tsx`, `courses/lib/courses.ts`:
  `ai_profile_id` on the course.

## Out of scope

- Per-conversation profile choice in chat.
- Profiles in backups (AI actions aren't backed up either). Restoring a
  backup leaves `ai_profile_id` unset.

## Manual test plan

1. Settings → AI profiles → New profile "French" with Language
   French. Make it the default.
2. Chat with Claude: the reply is in French. Run "Translate to
   English" on a page: the result is still English (task wins).
3. Create "Formal" (Tone: Formal) and set it on one course from the
   AI actions menu. An AI action on a page in
   that course follows "Formal"; one in another course follows the
   default.
4. Delete "Formal": that course's form shows "Use the default profile"
   again, and its actions follow the default.
