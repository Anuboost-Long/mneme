# Launch screen

Source: the user asked for a loading screen before the application
appears (7 October 2026). Depends on chain-sdk request 40
(`docs/chain-sdk-requests/40-show-window-when-ready.md`) to keep the
window hidden until the launch screen has painted.

## Behaviour

- From launch until `RootLayout` has opened the database and loaded the
  courses (or failed to), a launch screen covers the whole window: the
  app icon and the name "mneme" centred on the theme's background
  (`--surface`: white, or `#171b24` in dark theme).
- Behind it, a faint dot grid (24 px apart, fading out toward the window
  edges) fades in as the window appears, and a soft lime glow behind the
  icon comes up while the "m" draws. Both then stay still.
- Once the window is visible, the intro plays (2.65 s):
  1. the first lime point rolls in from the left to its place (0.65 s);
  2. the "m" thread draws itself in (0.9 s);
  3. the second lime point drops from above, bounces twice and settles
     (0.7 s);
  4. the word "mneme" fades in below the icon (0.4 s).
  If loading takes longer than 4 s, "Opening your workspace…" fades in
  near the bottom, so a slow migration doesn't look like a hang.
- The intro always plays out fully. Once it has and loading has
  finished, the launch screen fades out (160 ms, the same as page
  changes) and is removed. On failure it goes too, so the existing
  "Couldn’t open your courses" screen shows.
- The launch screen is a drag region, so the window can be moved while
  loading.
- With reduced motion: no intro or fades; the icon and name are shown as is.

## Source

- `index.html` — the launch screen's markup and CSS, inline, so it
  paints before any script or stylesheet loads, in the theme the inline
  theme script already picks.
- `src/app/launchScreen.ts` — `playLaunchScreenWhenShown()` starts the
  intro on `desktop.window.isShown()`/`onShown`; `dismissLaunchScreen()`
  waits for the intro, then fades.
- `src/layouts/RootLayout.tsx` — starts it on mount, dismisses it once
  `status` leaves `loading`.

## Chain dependency

Request 40 shipped 7 October 2026: `package.json` → `chain.window.showWhen:
"firstPaint"` keeps the window undrawn until `@chain/sdk` has loaded and
the inline launch screen has painted (default 3 s timeout), so there's
no white frame in dark theme. `desktop.window.isShown()`/`onShown` tell
the page when it appeared.

## Acceptance

- Light and dark theme: launch shows the icon on the theme background,
  then the app, with no flash of the app shell's loading state.
- A failing database shows the error screen, not a stuck launch screen.
- Reduced motion: no animation.
- After request 40: no white frame at launch in dark theme.
