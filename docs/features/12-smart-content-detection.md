# Phase 12 — Smart Content Detection

## Status — 5 October 2026

**Built and run in the dev build** (driven through `chain inspect`,
previews only, nothing saved). Results, with screenshots in the mneme
guide (Guide screen in the app, `/guide`):

- MIS501 Assessment 1 brief (PDF): Assignment, with its two due lines,
  each with its "12-week duration:" / "6-week duration:" label.
- BCS cyber security chapter (PDF): unsure; Ask AI answered Reading
  through the Claude connection in about 5 seconds.
- Moodle demo course page (school.moodledemo.net, course 62): module
  overview, 7 activities named by kind from their links ("Quiz: Factual
  recall test"), 3 files.
- Moodle demo assignment page, as a signed-in student sees it:
  Assignment, "Due: Tuesday, 14 December 2021" read as 14 Dec 2021,
  title without "| Mount Orange".

Not yet tried: a real school's Canvas or Brightspace page, and a page
imported all the way into a module.

## Goal

Understand imported learning material well enough that the student
doesn't have to sort it by hand. For every import (a link, the school
window, or a PDF, Word or Markdown file) the importer works out:

- what kind of page it is: module overview, lesson, lecture, exercise,
  discussion, assignment, reading, quiz or resource;
- the activities in it (exercises, discussions, assignments, quizzes and
  other named or numbered tasks);
- its due dates;
- the files it links to.

Rules come first. When they can't tell what kind of page it is, the
student can ask the AI.

## How it works

1. **Headings.** In web, Word and Markdown imports, a paragraph that is
   only bold text, or a short "Week 3", "Module 2", "Topic 1", "Lesson 4",
   "Part A" line, becomes a heading. (PDFs already find headings by font
   weight and size; see `13-import-tables-and-images.md`.)
2. **What kind of page.** The title decides when it names a kind
   ("Discussion 2", "Assessment 1 Brief", "Week 3 Lecture"). Otherwise
   the headings and text are scored: "Submission", "Rubric", "Marking
   criteria" for an assignment; "Required readings" for a reading;
   "Lecture slides", "Recording" for a lecture; several "Week/Topic"
   sections for a module overview; mostly file links for a resource
   page. A clear winner sets the Type; otherwise it stays Lesson and the
   rules say they aren't sure.
3. **Activities.** Named and numbered activities: Exercise, Discussion,
   Assignment, Assessment, Quiz, Activity, Lab, Practical, Tutorial,
   Worksheet, Homework, Project, Task, Challenge, Case study, Reflection,
   Problem set, Knowledge check ("Activity 2.1", "Task 3b: …").
4. **Due dates.** Lines that set a deadline: due, deadline, submit by,
   closes or submission date, followed by a date, a time, a weekday,
   "by", "on", "at" or a colon. A line that only mentions due dates
   ("late penalties apply after the due date") isn't one. A written date ("12 October 2026", "Oct 12",
   "12/10/2026", day first, "2026-10-12") is read as a date; a year left
   out means the next one to come. Lines without a date ("Sunday end of
   Module 4") are still listed.
5. **Files.** Links to documents, slides, spreadsheets, archives, audio
   and video, and LMS download links (Canvas `/files/…`, Moodle
   `pluginfile.php` and `/mod/resource/`, Blackboard `bbcswebdav`, `?download`).
   Learning platforms mark an activity's kind in its link, so Moodle
   (`/mod/assign/`, `/mod/quiz/`, `/mod/forum/`), Canvas
   (`/assignments/`, `/quizzes/`, `/discussion_topics/`) and Brightspace
   links are listed as "Quiz: Factual recall test". Moodle's hidden
   screen-reader word at the end of a link's text is dropped, and links
   back to the page itself are skipped. The page's own address sets its
   kind before the title does.
6. **Page details from the LMS.** A page title loses its "| Site name"
   ending. Moodle's "Opened:" and "Due:" lines from the page header
   become the page's first lines. A table cell read from a PDF keeps
   its line breaks, so a label like "12-week duration:" stays with the
   deadline under it.
7. **The preview** says what the page looks like ("Looks like an
   assignment") and pre-picks the Type. Due dates, activities and files
   are listed with tick boxes, all ticked; the ticked ones go at the top
   of the page: a **Due dates** list, the **Activities** checklist, and a
   **Files** list of links.
8. **AI fallback.** When the rules aren't sure, **Ask AI** sends the
   title, headings and the start of the text to the agent the AI actions
   use, which answers with one kind. The Type follows it; the student can
   still change it.

## Source locations

- `src/features/courses/lib/content-detection.ts` — kind, activities,
  due dates, files, and the summary written at the top of the page.
- `src/features/courses/lib/classify-with-ai.ts` — the AI fallback.
- `src/features/courses/lib/import-sanitize.ts` — headings from bold or
  "Week 3" paragraphs.
- `src/features/courses/components/ImportFindings.tsx` — the preview's
  lists.
- `src/features/courses/components/LmsImportForm.tsx` — runs detection
  and the AI fallback.

## Dependencies

- Phase 10's importer and Phase 11's school window (sources of HTML).
- The agent chosen for AI actions (Phase 21/22) for the AI fallback. No
  new Chain capability.

## Acceptance criteria

- "Assessment 1 Brief" imports as an Assignment, with its two due lines
  listed.
- A discussion page imports as a Discussion; a page titled only "Week 3"
  with lecture slides and a recording as a Lecture.
- A page with "Activity 2.1", "Task 3" and "Quiz 1" lists all three.
- "Due: 12 October 2026" reads as 12 October 2026.
- Links to a PDF and a Canvas file download are listed as files.
- A page the rules can't place offers Ask AI, and the answer sets the
  Type.

## Out of scope

- Downloading the linked files into the page (Phase 40).
- Turning due dates into tasks (Phases 35 and 36).
- A Quiz page type: quizzes are detected, and import as Exercise pages.
