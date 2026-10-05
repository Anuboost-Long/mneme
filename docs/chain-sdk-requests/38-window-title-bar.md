# Capability Request 38 — Window title bar and chrome

Source: mneme's window on macOS 27. The system title bar is now drawn
as a separate solid strip above the app, so mneme's dark nav bar sits
under a differently coloured bar instead of blending into it. mneme
never set any title bar options; it gets whatever the OS draws by
default, which just changed underneath it.

## The problem

An app built on Chain can't decide what its window looks like:

- It can't run its own content under the title bar (the "unified" look
  of Notion, VS Code, Linear, Arc), with the window buttons sitting on
  the app's own top bar.
- It can't mark parts of its page as "drag here to move the window",
  which any custom top bar needs.
- It can't know where the window buttons are or how tall the title bar
  is, so it can't leave room for them, and it can't follow them when
  they move or disappear (full screen).
- It can't set the window's own background colour, so the standard bar
  and the moment before the page paints use the OS default rather than
  the app's colours.

mneme can't do any of this itself: window chrome belongs to the native
side, and the app must not use Tauri window options, `tauri.conf.json`
in `.chain/native/`, or Tauri's `data-tauri-drag-region` directly.

The user asked for this to be a set of options developers can choose
from, not one look decided for every app.

## What's asked for

The exact shape is chain-sdk's contract decision (rule 1). Each of the
following is a requirement: an option with a documented default that
keeps today's behaviour (the standard system title bar). Each option must
be settable in the app's Chain configuration, so the first frame is
already right, and changeable at runtime where the OS allows it.

### Title bar style

- **`standard`** (default): today's system title bar.
- **`transparent`**: the system bar stays, with its own height, but is
  drawn in the window's background colour, so it blends with an app
  whose top matches.
- **`overlay`**: the app's content fills the whole window, including
  under the title bar; the window buttons are drawn over the content.
  This is what mneme will use.
- **`hidden`**: no title bar and no window buttons; the app draws
  everything, including its own close/minimise/zoom controls if it
  wants them.

### Title bar details

- **Show or hide the title text** (the window title shown in the bar),
  independent of the style. Default: shown for `standard`, hidden for
  `overlay`.
- **Window button position**: an offset for the close/minimise/zoom
  buttons (macOS "traffic lights"), so they can be centred on an app bar
  taller than the system one. Default: the system position.
- **Window button visibility**: show or hide them individually or all
  together (e.g. an app with no zoom). Default: all shown.
- **Title bar appearance**: light, dark, or follow the system, so the
  buttons and title text stay readable on the app's own colours.
  Default: follow the system. Changeable at runtime, because mneme has
  its own light/dark switch.

### Window background

- **Background colour** for the window itself, settable in config (so
  there's no white flash before the page paints) and at runtime (mneme
  changes theme and accent colour while running).

### Dragging the window

- **Drag regions declared from the page**: a way to mark elements (and
  everything inside them that isn't interactive) as "drag to move the
  window", e.g. a Chain-owned data attribute or a call with the
  elements. Buttons, links and inputs inside a drag region must still
  work normally.
- **Double-click on a drag region** does what the OS setting says
  (zoom or minimise on macOS), as the real title bar does.
- **Start a drag from code**, for apps with their own pointer handling.

### Knowing where the chrome is

- **Title bar insets**: the title bar's height and the rectangle the
  window buttons occupy, in CSS pixels, so the app can pad its top bar
  and leave room on the left (or right, on Windows).
- **Change events**: these insets change when the window enters or
  leaves full screen (macOS hides the buttons), when the button offset
  changes, or when the style changes at runtime; the app needs to be
  told, for example through CSS variables Chain keeps up to date and a
  listener.
- **Full-screen state**, readable and with a change event, since an
  `overlay` app usually removes its left padding in full screen.

### Platforms

- macOS is required, since mneme runs there. Document what each option
  does on Windows and Linux, including which ones are ignored. A missing
  option must never fail: reported through `availability()` instead.

## How mneme will use it

- Style `overlay`, title text hidden, title bar appearance following
  mneme's own theme, window background set to mneme's background colour
  and updated when the theme changes.
- `NavBar` becomes the drag region, padded on the left by the window
  buttons' width, and the padding goes away in full screen.
- Window buttons offset so they're centred on the nav bar's height.

## Acceptance

- With no options set, every app looks exactly as it does today.
- An `overlay` app's top bar runs to the top of the window; the window
  buttons sit on it; dragging empty space in it moves the window;
  buttons inside it still click; double-click zooms.
- Entering full screen fires the change event and the inset reported for
  the window buttons becomes empty.
- Switching the app's theme at runtime updates the window background and
  the title bar appearance with no restart.
