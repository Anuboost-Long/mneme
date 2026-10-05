# Phase 11 — Authenticated LMS Pages

## Status — 5 October 2026

**Done.** Uses chain-sdk's `desktop.browser` (request 36,
`docs/chain-sdk-requests/36-signed-in-browser-window.md`). Run through
the manual test plan against a real LMS. The sign-in action and the
School site settings only show where `desktop.browser.availability()`
says it works (macOS 14 and later).

Every LMS lays its pages out differently, so how well a page reads
varies by site. Improvements per site come later, with Phase 12's
content detection.

## Goal

Import school pages that need a login, without getting around the
school's security and without mneme ever holding a password. The
student signs in themselves in a real browser window, goes to the page,
and imports the page they're looking at.

## How it works

1. **Start from the module.** The Import from LMS dialog
   (`src/features/courses/components/LmsImportForm.tsx`) gains **Sign in
   to your school site**. It opens the browser window beside mneme, at
   the address typed in Page URL, or else the saved school site. The
   first address used is saved as the school site (its origin, for
   example `https://canvas.school.edu`).
2. **Sign in normally.** The window is a real browser for the site:
   single sign-on, multi-factor and its popups work as usual. The
   session stays signed in between launches, for as long as the school
   allows.
3. **Go to the page, then Import this page.** A button in the window's
   toolbar reads the page as it stands, frames included (each readable
   frame replaces its iframe), and fills mneme's dialog with the same
   preview as a pasted link: editable title, page type, the activities
   found, into the module the dialog was opened from. The button is
   off while a preview is open.
4. **Save.** Pictures are downloaded through the signed-in session,
   with the same progress as today, so they show offline and reach the
   AI. A picture that still can't be downloaded keeps its address, as
   now.
5. **Import more.** After saving, the dialog goes back to waiting and
   lists the pages imported so far; the window stays open for the next
   page. **Done** in the window, or **Close school window** in the
   dialog, closes it. Closing the dialog closes the window too.

A pasted link that comes back as a login page (it has a password field,
or the site answers 401/403) says so and points to **Sign in to your
school site**.

## Settings

Settings → General → **School site**:

- The address the window opens at. Changing it doesn't sign out.
- **Sign out**, which clears the window's cookies and site storage.

## Source locations

- `src/features/courses/lib/school-browser.ts` — the only caller of
  `desktop.browser`: open with Import this page and Done, turning the
  import button on and off, reading the page with its frames,
  downloading pictures with the session, sign out, and the
  `school-site` setting.
- `src/features/courses/lib/lms-import.ts` — `storePageImages` takes the
  download function; `isSignInPage` spots a login page.
- `src/shared/lib/downloadImage.ts` — `imageFile`, shared by both
  downloads.
- `src/features/courses/components/LmsImportForm.tsx` — the sign-in
  action, the waiting state and repeated imports.
- `src/features/courses/components/SchoolSiteSettings.tsx` — Settings →
  General → School site.

## Dependencies

- chain-sdk request 36 (signed-in browser window): window, toolbar
  buttons, persistent session, reading the page and its frames, fetch
  with the session, sign out.
- Phase 10's importer (parsing, activities, progress, page creation).

## Keeping logins out of mneme

- mneme stores the school's address only. Cookies, passwords and tokens
  stay in the OS web engine's own store, which mneme can't read.
- The page is read only when the student presses Import this page, and
  only the page they're on.
- Backups don't include the session.

## Acceptance criteria

- [x] Sign in through the school's single sign-on, with multi-factor, inside
  the window.
- [x] Quit and reopen mneme: still signed in.
- [x] Import this page on a login-only page gives the same preview as a
  public link, with the page's real content, not the login page.
- [x] A lesson shown inside a same-origin frame is imported.
- [x] Login-protected pictures are saved as files.
- [x] Sign out clears the session: the next open shows the login page.
- [x] The database and backups contain no cookie, token or password.

## Out of scope

- Importing a whole module or crawling a site (Phase 40).
- Detecting content types beyond today's activities (Phase 12).
- Downloading linked files from the window.
- Several schools at once (the capability allows it; mneme keeps one).

## Manual test plan

- [x] Sign in to a real LMS through Microsoft or Google sign-in.
- [x] Import a lesson page: title, text, lists and pictures match.
- [x] Import a page whose lesson sits in a frame.
- [x] Import two pages in a row without closing the window.
- [x] Quit and reopen mneme, open the window: still signed in.
- [x] Sign out in Settings, open the window: the login page shows.
- [x] Paste a login-only link in the import dialog: it offers to sign in.
- [x] Search the database file for the school's cookie names: nothing.
