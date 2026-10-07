# Capability Request 40 — Show the window when the app is ready

Source: mneme's launch. mneme is adding a launch screen
(`docs/features/43-launch-screen.md`): its icon centred on the theme's
background, shown until the database is open and the courses are
loaded. It builds on the window capability (request 38).

## The problem

The window appears the moment the app starts, before the page has
painted anything. What the user sees first is the window's startup
background (`chain.window.backgroundColor`, a single colour fixed in
`package.json`), then the page's launch screen, then the app:

- Someone using mneme's dark theme gets a white window for a moment,
  then the dark launch screen. Runtime `setOptions({ backgroundColor })`
  doesn't help, because the contract (rightly) forgets runtime changes
  at quit, so every launch starts from `package.json` again.
- Even with a matching colour, an empty window with no content looks
  like the app has hung, and the launch screen then pops in.

Native apps avoid this by keeping the window hidden until the first
frame is ready and then showing it already drawn. mneme can't do that
itself: whether the window starts visible belongs to the native side,
and the app must not set Tauri's `visible` option in
`.chain/native/tauri.conf.json` or call Tauri's window API.

## What's asked for

The exact shape is chain-sdk's contract decision (rule 1). Each of the
following is a requirement: an option with a documented default that
keeps today's behaviour, settable in the app's `chain.window` config
(it decides the very first moment, so runtime isn't enough).

### When the window first shows

- **`immediately`** (default): today's behaviour.
- **After the page's first paint**: the window stays hidden until the
  page has drawn its first frame, then shows. The first thing the user
  sees is the page's own content (mneme's launch screen, already in the
  right theme). This is what mneme will use.
- **When the app says so**: the window stays hidden until the page
  calls a show method on `desktop.window`. For apps that want to wait
  for their own data, or for a specific element to render.

### Never stuck hidden

- **A timeout** after which the window shows anyway, whatever the mode,
  so a page that fails to load or never calls show still gives the user
  a window (with whatever it has, e.g. an error). Settable in config,
  with a documented default of a few seconds.
- **Show is safe to call any time**: calling it when the window is
  already visible does nothing and doesn't fail; it never steals focus
  from another app beyond what a normal launch does.
- **Reloads don't hide the window again.** A dev-server reload or a
  page reload keeps the window visible; the mode only applies to the
  window's first appearance.

### Launch behaviour stays normal

- The app's Dock icon (or taskbar entry) appears and the app is
  launched as usual while the window is hidden; clicking the Dock icon
  during that time doesn't create a second window or fail.
- The window comes up at its normal size and position and becomes the
  key, focused window, exactly as with `immediately`.

### Knowing it happened

- A way for the page to know whether the window has been shown yet
  (e.g. a read plus a change event), so an app can start its launch
  animation when it becomes visible, not while hidden.

### Platforms

macOS is required. Document Windows and Linux; a mode a platform can't
do falls back to `immediately` and is reported through `availability()`,
never an error.

## How mneme will use it

- `package.json` → `chain.window`: show after the first paint, with the
  default timeout.
- `index.html` already paints a themed launch screen from inline HTML
  and CSS before any script loads, so the first visible frame is the
  launch screen in the user's theme, with no white flash for dark
  theme.
- mneme starts its launch animation once the window reports it's
  visible.

## Acceptance

- With the option unset, every app launches exactly as today.
- With "after first paint", a dark-themed page whose `package.json`
  background is white never shows a white frame at launch: the first
  visible frame is the page's content.
- With "when the app says so", the window stays hidden until show is
  called; calling show twice is harmless.
- A page that throws before painting, or never calls show, still gets a
  visible window when the timeout passes.
- Reloading the page (or a Vite hot reload in `chain dev`) never hides
  the window.
