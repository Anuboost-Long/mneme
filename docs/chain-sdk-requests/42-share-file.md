# Capability Request 42 — Share a file through the system share menu

Source: mneme's Share as PDF (`docs/features/45-share-as-pdf.md`).
After making a PDF, the student wants to send it to a friend straight
away: AirDrop, Messages, Mail, a chat app.

## The problem

Today the app can only save the file (`desktop.files.save`) and reveal
it in Finder (request 06). The student then has to find it and drag it
into another app. macOS has a standard share menu for exactly this, and
the app can't open it without calling native APIs.

## What's asked for

The exact shape is chain-sdk's contract decision. Each item is a
requirement.

- **Open the system share menu for one or more files** the app owns
  (paths from `desktop.files`, or the PDF path from request 41).
- **Anchored to an element**: the app passes the rectangle of the button
  that opened it (page coordinates), so the menu appears next to it.
  Without one it's centred on the window.
- **Optional text and title** passed along with the files, for services
  that use them (Mail's subject, a message body).
- **Result**: resolves when the menu closes, saying whether the user
  picked a service (and which, where the platform says) or cancelled.
  Cancelling isn't an error.
- **Files stay valid** until the chosen service has finished reading
  them; chain-sdk documents when the app may delete a temp file it
  shared.
- `availability()` says whether the share menu exists on this platform,
  so the app can fall back to the save sheet.
- Errors reject with a readable message and a code (file missing, not
  supported).

## Platforms

macOS first. Windows later (its share UI), same contract.

## Not asked for

- Sharing to a specific service directly, or receiving shared files.
