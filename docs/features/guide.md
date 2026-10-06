# Guide

## Status — 5 October 2026

Built and opened in the dev build: the sidebar's **Guide** link, the
topic list and a topic's steps with screenshots.

## Goal

Show, inside mneme, where each feature lives and how to use it, with
screenshots from the app, so features stay findable as more ship.

## How it works

- **Guide** in the sidebar (and in the command palette) opens the first
  topic. It's laid out like Settings: Back to home, the page title, the
  topics on the left (a row of tabs on narrow windows), the topic on the
  right.
- A topic (`/guide/:topicId`) has its title, a summary, where to find
  it ("Any module → Import → From file") and a button to go there, then
  its steps as sections between dividers: "Step 1", the step's title and
  words on the left, its screenshots on the right.
- Topics today: importing a file, Ask AI when mneme can't tell what a
  page is, importing from a school site, and icons.

## Adding a topic when a feature ships

1. Take the screenshots in the dev build with `npx chain inspect`
   (`--focus`, then `--screenshot`), stopping at previews so nothing is
   saved.
2. Shrink them to 1600 px wide JPEGs in `src/features/guide/assets/`,
   named for what they show.
3. Add the topic to `guideTopics` in `src/features/guide/lib/topics.ts`.

## Source locations

- `src/features/guide/lib/topics.ts` — the topics, steps and screenshots.
- `src/features/guide/pages/GuidePage.tsx`: the Settings layout, topics on the left.
- `src/routes/GuideRoute.tsx` (`/guide` opens the first topic); `src/router.tsx`.
- `src/app/Sidebar.tsx` (link), `src/app/CommandPalette.tsx` (place).
