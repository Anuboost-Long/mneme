# Capability Request 28 — Dev performance tracing

Source: a performance pass on mneme (1 October 2026). The user asked for
a way to "measure our app carefully and analyse everything".

## What blocked careful measurement

Measuring mneme from `chain inspect --eval` today hits four walls:

1. **Native calls can't be observed.** `window.__TAURI_INTERNALS__.invoke`
   is non-writable and non-configurable, so nothing can wrap it. The only
   workaround is wrapping `desktop.storage.query/execute` on the module
   instance Vite serves the app, and that misses everything else. It
   misses `storage.table()` (its runner calls the internals directly),
   files, http, tts, and so on.
2. **No native-side timing.** A JS timer around a call can't separate
   IPC and serialization cost from the Rust handler's time, or SQLite's
   time from either.
3. **Hidden windows give wrong numbers.** With the mneme window behind
   others, `document.visibilityState` is "hidden": requestAnimationFrame
   stops and timers are throttled, so animation and frame timing are
   meaningless. Bringing the window forward with osascript or
   `screencapture` triggers macOS permission prompts, which the user
   doesn't want.
4. **WKWebView has no long-task API**, so main-thread stalls are
   invisible.

## What's asked for

A dev-only tracing capability, compiled into `chain dev` builds like the
inspector and never into `chain build`. The exact shape is chain-sdk's
contract decision (rule 1); roughly:

- **Trace every native call.** Record each invoke: the command, a short
  argument summary (SQL text for storage), JS-observed duration,
  native-side handler duration, and payload sizes in and out. For storage,
  also the SQLite execution time and rows returned. Exposed through the
  inspector, e.g. `chain inspect --trace start|stop|dump` printing JSON,
  plus a summary grouped by command or SQL (count, total, median, p95).
- **Keep the window rendering.** A way to raise and focus the app window
  from the inspector through Tauri's own window API (no macOS
  accessibility or screen-recording prompt), e.g.
  `chain inspect --focus`. Or a dev flag that keeps the webview
  rendering while it's hidden.
- **Frame and stall timing.** A main-thread stall and frame-gap recorder
  that works in WKWebView, e.g. an injected rAF and timing probe started
  with the trace, reporting frames over 16/33/50 ms and what native calls
  were in flight.
- **Process stats, if cheap.** RSS memory and CPU for the app process
  (and the webview process on macOS), sampled during a trace.

Windows parity per rule 3 (no single-platform contracts): WebView2 does
have the long-task API, but the invoke trace and window focus should
work the same on both.

## What mneme will do with it

Run a scripted pass over every screen and dialog: Home widgets,
course/module/page screens, the editor while typing and autosaving, the
command palette, Recently deleted, Recordings, chat. That pass produces a
per-screen budget (native calls, time, frames dropped) that later
changes can be checked against. It replaces the hand-rolled probe that
currently only sees part of the traffic.

## Please update in mneme when done

Update mneme's `@chain/sdk` / `@chain/cli` and the inspector docs, then
signal the mneme session.
