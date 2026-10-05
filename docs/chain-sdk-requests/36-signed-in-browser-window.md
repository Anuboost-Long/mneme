# Capability Request 36 — A signed-in browser window for school sites

Source: `AI Learning Workspace — Development Roadmap.md`, Phase 11
("Authenticated LMS Pages"). Request 4 (`desktop.http`) left login
sessions out on purpose and pointed here.

## The problem

Most course material sits behind the school's login (Canvas, Moodle,
Blackboard, Brightspace, usually through Microsoft, Google or Okta single
sign-on, often with multi-factor). `desktop.http` fetches pages without
a session, so an LMS link gives back the login page.

The roadmap is explicit: don't get around school security, and keep
login details out of mneme. The student signs in themselves, in a real
browser, and mneme reads only the page they're already looking at.

Neither can be done from the app's own webview:

- An LMS page can't be loaded inside mneme's window. Most of them send
  `X-Frame-Options`/`frame-ancestors`, and single sign-on refuses to run
  in a frame.
- Even if it loaded, the app's origin couldn't read a cross-origin
  page's content or its cookies.

So this needs a second, native web view that the app controls.

## What's asked for

The exact shape is chain-sdk's contract decision (rule 1). Each of the
following is a requirement.

### The window

- **Open a browser window at a URL**: a separate OS window holding a
  full web view, for example `browser.open({ url, ... })`. It behaves
  like a normal browser for the site: JavaScript, cookies, redirects and
  single sign-on all work.
- **Sign-in popups**: `window.open` and `target=_blank` links that
  single sign-on uses (Microsoft, Google, Okta) open in a child window
  that shares the session, or in the same window, and closing the popup
  returns to the opener as in a browser.
- **Toolbar**: Back, Forward, Reload and the current address (read-only
  is fine), so the student can get around a site and see where they
  are. Option: `toolbar?: boolean` (default on).
- **App-defined toolbar buttons**: the app passes buttons (id, label),
  and pressing one emits an event with the id and the current page's
  URL and title. mneme uses this for **Import this page** and **Done**,
  so the button sits where the student is looking. Buttons can be
  enabled or disabled while the window is open.
- **Window options**: title, initial size, minimum size, and whether it
  opens beside the app window. Opening again while it's open focuses
  it and navigates to the new URL, if one is given.
- **Close it** from the app, and an event when the student closes it.

### The session

- **A persistent, separate session**: cookies and site storage live in
  the OS web engine's own data store (WKWebsiteDataStore with a fixed
  identifier on macOS, a WebView2 user-data folder on Windows), kept
  between app launches, separate from the app's own webview. The student
  signs in once and stays signed in for as long as the school allows.
- **Named sessions**: an option such as `session?: string` (default
  `"default"`), so an app can keep two schools apart.
- **Clear a session** (Sign out): delete its cookies and storage.
- **Credentials never reach the app**: no API gives the app cookie
  values, passwords or tokens, and nothing about the session is written
  to the app's database. The app can't run arbitrary script in the
  page; reading content (next section) is the only way in.

### Reading the page

- **Current page**: URL and title on request, plus an event on each
  navigation (rule 6), so the app knows which page is open without
  polling.
- **Read the page's content** when the app asks (only after the student
  pressed a button): the rendered HTML of the page as it stands now,
  after its JavaScript ran (`document.documentElement.outerHTML`), with
  the URL and title it came from.
- **Frames**: LMS pages often show the lesson inside an iframe. Include
  the HTML of each frame the engine lets the page itself read
  (same-origin frames), each with its URL, and list the frames that
  couldn't be read. Reading must not get around the browser's own
  cross-origin rules.
- **Fetch with the session**: download a URL using that session's
  cookies and return the bytes, content type and status, like
  `desktop.http` with binary responses (request 24). The importer uses
  it for the page's pictures, which are login-protected too. Only
  `http`/`https`, GET only.

### Availability and errors

- `availability()` says whether the browser window is supported here,
  and which of the options above are.
- Normalized errors (rule 5): window not open, page still loading,
  content not readable, fetch failed (with status), session store
  unavailable.

### Windows parity (rule 3)

The same through WebView2: a separate user-data folder per session,
`NewWindowRequested` for sign-in popups, `ExecuteScriptAsync` for
reading content and frames, and `WebResourceRequested` or the session's
cookie manager for fetching with the session.

## Out of scope

- Reading any page other than the one open, or crawling a site.
- Filling in or submitting login forms for the student, or storing
  passwords.
- File downloads from the browser window (Phase 40 may ask later).
- Browser extensions, devtools in release builds, multiple tabs.

## What mneme will do with it

See `docs/features/11-authenticated-lms-pages.md`:

- **Sign in to your school site** from a module's Import from LMS
  dialog opens the window at the school's address (remembered as a
  setting: an address only, never a login).
- The student signs in and goes to the page; **Import this page** in
  the window brings mneme forward with the usual import preview
  (title, type, activities) for that module.
- The page's pictures are downloaded through the session.
- Settings → General → School site: the address, and **Sign out**,
  which clears the session.

## Please update in mneme when done

Update mneme's `@chain/sdk` and the capability's CONTRACT.md, then
signal the mneme session.
