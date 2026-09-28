# CLI Request 13: make `chain build` / `chain dev` failures show as errors

Source: running `npm run build:mac` in mneme. Not a capability request.
This one is about `packages/cli`'s condensed output
(`src/nativeOutput.ts`, `src/build.ts`).

## What happened

`chain build --target x86_64-apple-darwin` failed on a machine that only
has the `aarch64-apple-darwin` Rust target installed. The Tauri CLI
printed:

```
       Error failed to build app: Target x86_64-apple-darwin is not installed (installed targets: aarch64-apple-darwin). Please run `rustup target add x86_64-apple-darwin`.
```

`chain build` showed that line **dim gray**, the same way it shows
ordinary Tauri banners. Nothing marked it as the reason the build failed.
There was no red line, no `✘` status, and no closing "build failed"
summary. The process exited non-zero, but you could only tell by reading
the text closely.

## Why (from reading the CLI source)

`processLine()` treats a line as an error only when it matches
`/error(\[|:)/i`. That covers rustc's `error[E0308]:` and `error:`, but
the Tauri CLI prints its own failures as `Error <message>`: capital `E`,
a space, and **no colon**. So the line falls through to the final
"unrecognized line" branch and is printed with `ansi.dim`.

Tauri's `Warn <message>` banners have the same problem. They also skip
the `warning:` check.

`build.ts` then calls `process.exit(code)` without printing anything
itself, so nothing on screen marks the non-zero exit as a failure.

## What's asked for

1. **Recognize Tauri CLI diagnostics.** A line whose first word is
   `Error` (e.g. `/^\s*Error\s/`) counts as an error: print it in
   `ansi.red`, increment `state.errors`, and set the native status to
   `error` (`✘`). Treat `Warn` (`/^\s*Warn\s/`) the same way as
   `warning:`, in yellow. Keep the existing rustc patterns as they are.
2. **Print a closing summary on failure.** When the `tauri build` child
   exits non-zero, `chain build` should end with one clear red line
   before exiting with the same code. For example:
   `✘ Build failed (exit 1). See the error above.` If any error lines
   were captured, repeat the last one (or the first) there, so it isn't
   lost in the scrollback. On success, a green `● Build finished` line
   would balance it, but that part is optional.
3. **Same treatment in `chain dev`.** Its output goes through the same
   `processLine()`, so part 1 covers it. Check whether `dev.ts` needs the
   same summary when the native process exits with an error.
4. **Colors stay TTY-only.** Keep using `makeColor(process.stdout.isTTY)`
   so piped or CI output stays plain text.

## Nice to have (your call)

- **Actionable hint for the missing Rust target.** This failure is common
  with mneme's `build:mac` script, which builds both Apple targets. When
  the error contains `Target <triple> is not installed`, a dim follow-up
  line could spell out the fix:
  `→ run: rustup target add <triple>`. Tauri already includes the fix in
  its message, so this only helps if it reads clearer than the original.
  Skip it if it feels like special-casing.
- **`chain doctor`** could list the installed Rust targets, so you can
  catch this before a long frontend build.

## Explicitly not asked for

- Don't change which lines are shown or hidden. Condensing still must
  never swallow output. This request is only about color and a summary.
- Don't install Rust targets automatically. That changes the user's
  toolchain, so it stays their decision.

## Please update in mneme when done

mneme depends on `@chain/cli` through `file:../chain-sdk/packages/cli`.
Once the CLI is rebuilt, confirm that `npm run build` in mneme uses the
new `dist/`, then signal mneme's session. To check it, run
`npm run build:mac` on a machine without the x86_64 target and confirm
the failure shows in red with the closing summary.
