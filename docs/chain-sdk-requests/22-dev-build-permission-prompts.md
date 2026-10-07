# Capability Request 22 — Dev builds ask for permissions as the app itself

> **Shipped 29 September 2026:** `chain dev` relaunches the app so it's
> responsible for itself (`chain_core::dev_launch`). No mneme config
> needed; the development-build note is gone from the dialog.

Follow-up to request 18 (microphone). Found while testing Phase 16
(Audio Recording) under `npm run dev`.

## What happens today

The microphone contract's "Development caveat" is exactly what we hit:
under `chain dev`, macOS attributes the dev binary's microphone request
to the terminal or editor that launched it. When that app has never been
granted the microphone (or can't be — it lacks the usage description or
entitlement), `getUserMedia` rejects `NotAllowedError` **with no
prompt**, and the app never appears in System Settings → Privacy &
Security → Microphone. There's nothing for the user to turn on.

A bundled build started on its own works: the first `getUserMedia`
shows macOS's own "mneme would like to access the microphone" prompt.

## What's asked for

Make `chain dev` launch the app so macOS treats the dev binary as
**responsible for itself**, so the first use shows the OS prompt with
the app's own name and usage description, and the app then appears in
the Privacy list. The same applies to speech recognition (request 19)
and any future TCC-gated permission.

Possible approaches, for chain-sdk to choose:

1. Spawn the dev binary with responsibility disclaimed
   (`responsibility_spawnattrs_setdisclaim` on the `posix_spawnattr_t`,
   the approach terminals and editors use for their own children). The
   binary already carries the merged `Info.plist` with the usage
   descriptions, so TCC has what it needs.
2. Wrap the dev binary in a minimal `.app` under `.chain/native/target`
   and start it with `open`, keeping log streaming in `chain dev`.

Whichever it is, `npm run dev` should stay one command with the same
condensed output and hot reload.

## Acceptance

- Fresh machine state (`tccutil reset Microphone <bundle id>`), run
  `npm run dev`, start a recording: macOS shows the prompt naming the
  app with the `chain.permissions.microphone` sentence.
- After allowing, the app is listed under Privacy & Security →
  Microphone and recording works; after denying, it's listed and turned
  off, and `getUserMedia` rejects `NotAllowedError`.
- Update the microphone CONTRACT.md "Development caveat" accordingly.

## What mneme does meanwhile

The recorder's "Show how to turn it on" dialog adds a development-build
note: turn the microphone on for the launching terminal/editor, or open
a built copy. mneme drops that note once this ships.

## Please update in mneme when done

Update mneme's `@chain/sdk` and any `.chain/native` template change for
`chain update`, then signal mneme's session.
