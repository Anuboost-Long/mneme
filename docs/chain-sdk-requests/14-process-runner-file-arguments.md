# Capability Request 14 — Pass a `desktop.files` reference to `processRunner.run()` as a real path argument

Source: Phase 25 (chat file attachments), see
`docs/features/25-chat-file-attachments.md`. Extends capability 10
(`process-runner`) and relies on capability 02 (`files`) unchanged.

## The need (real, not hypothetical)

Chat now takes text-file attachments (code, Markdown, CSV, JSON...).
Those are read with `File.text()` in the webview and sent on stdin
(request 12), so they needed nothing new. **Images and PDFs can't go that
way**, and they're the attachments users expect most from "attach a
file like ChatGPT".

- **Codex:** the only way to give `codex exec` an image is
  `-i, --image <FILE>...` (per the installed CLI's own `codex exec
  --help`). It takes a **path on disk**. There's no stdin/base64 form.
- **Claude Code:** mneme will try `--input-format stream-json` on stdin
  with base64 image blocks first. That needs no new capability (see
  "What mneme will do"). If that doesn't hold up live, Claude also needs
  the same path mechanism below, because its only other route to an
  image or PDF is its `Read` tool on a path.

mneme can already put the bytes on disk: `desktop.files.write(bytes, {
extension: "png" })` returns a reference. What it can't do is name that
file to a child process. `files`' contract says it **never returns a
real path** (the Windows `MAX_PATH` reason in `research/WINDOWS.md`), and
this request keeps that rule: the path never reaches JS.

## What's asked for

Let an element of `run()`'s `args` be a **managed-file reference**. The
native side resolves it to the file's absolute path when it builds the
argv. JS never sees the path.

```
type ProcessArg = string | { fileReference: string };

run(
  command: string,
  args: ProcessArg[],
  onOutput: (chunk) => void,
  options?: { stdin?: string }
): Promise<Handle>   // Handle unchanged
```

- `{ fileReference }` is replaced by **exactly one argv element**: the
  absolute path of that `desktop.files` reference. No shell and no
  splitting, the same literal-argv rule as every other element.
- A reference that doesn't resolve rejects `run()` with `ChainError {
  code: "NOT_FOUND" }` **before** spawning. That's the same code
  `files.read`/`url` already use.
- Plain `string` elements behave exactly as they do today. Every
  existing caller stays source- and behavior-compatible.
- Windows: pass whatever form of the path the OS spawn API accepts for
  long paths (for example a `\\?\` prefix if the managed dir can go over
  `MAX_PATH`). That's the reason `files` hides paths, so the fix belongs
  here, on the native side.

## Explicitly not asked for

- No `files.path()` / nothing that returns a path to JS.
- No substitution **inside** a string argument (`"see {0}"`). A whole
  element is all Codex needs. Ask again only if Claude's stream-json
  route fails.
- No temp-file lifecycle in the capability. mneme writes the file with
  `files.write` and deletes it with `files.delete` after `exited`
  resolves.
- No knowledge of images, MIME types or which CLI flag takes the path.
  The capability stays generic.

## What mneme will do with it

`runTurn.ts`: for each image attachment, `files.write` the bytes and
push `"--image", { fileReference }` into Codex's args. After the turn,
`files.delete` each reference. Claude uses stream-json stdin. For
passthrough/custom agents, images are refused with a clear message.

## Please update in mneme when done

After it lands, update mneme's `@chain/sdk` dependency so `args:
ProcessArg[]` typechecks here, confirm `cargo check` for `.chain/native`
is clean, and update `process-runner/CONTRACT.md`. Then send mneme's
session (`mneme-2c`) the signal to continue.
