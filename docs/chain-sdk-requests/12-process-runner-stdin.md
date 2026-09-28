# Capability Request 12 — Give `processRunner.run()` a one-shot stdin payload

Source: Phase 22 (Custom AI Actions), see
`docs/features/22-custom-ai-actions.md`. Extends capability 10
(`process-runner`). Its CONTRACT.md lists "No stdin" as a non-goal
*"until a real need shows up"*. This request is that need.

## The need (real, not hypothetical)

Phase 21's quick actions (implemented) send the page or selection to the
user's agent CLI **inside argv**, as part of the prompt argument. Phase 22
lets the user build their own actions whose context is the **current
module** or the **entire course**: every page's content, concatenated.
That outgrows argv:

- **macOS:** `ARG_MAX` is 1,048,576 bytes for all arguments *plus the
  environment* (checked on the dev machine with `getconf ARG_MAX`). A
  course of a few dozen note-heavy pages gets there.
- **Linux:** a single argument is capped at `MAX_ARG_STRLEN` = 131,072
  bytes, whatever `ARG_MAX` says. One large module breaks it.
- **Windows:** the whole command line is capped at 32,767 characters.
  Even one long page can break it, and so can a long chat message
  today.

Today mneme guards this with a 200,000-character cap and an error
message ("too long, select part of it"). That's fine for a page, but for
module and course actions it would refuse to run on ordinary material.

Both agent CLIs mneme drives already accept exactly this shape:

- **Claude Code:** `claude -p "<task>"` with content piped on stdin
  treats stdin as context for the task. **Verified live on the dev
  machine:** `printf 'The secret word is PELICAN.' | claude -p "Reply with
  only the secret word from the piped input."` printed `PELICAN`.
- **Codex:** `codex exec --help`: *"If stdin is piped and a prompt is
  also provided, stdin is appended as a `<stdin>` block."* (Documented
  in the installed CLI's own help. Not run live, to avoid spending the
  user's Codex quota. Please verify it the same way if convenient.)

## What's asked for

An **optional, one-shot stdin payload** on the existing `run()`: write
it all to the child's stdin, then close stdin. Not an interactive
stream.

```
run(
  command: string,
  args: string[],
  onOutput: (chunk) => void,
  options?: { stdin?: string }
): Promise<Handle>   // Handle unchanged
```

- `options.stdin` given: the child is spawned with a piped stdin, the
  whole string is written as UTF-8, then stdin is **closed**, so the
  child sees EOF. The CLIs above wait for EOF before starting.
- `options` omitted: **exactly today's behaviour**. mneme's existing
  chat turns and quick actions must not change. Please keep whatever
  stdin the child gets today for that case (null / inherited) rather
  than switching it to an empty pipe, unless there's a reason; if you
  do change it, tell me, because some CLIs behave differently when
  stdin is a pipe.
- Write the payload **without blocking stdout/stderr reading**. A child
  may start printing before it has consumed all of stdin, so a
  synchronous write-then-read on one thread could deadlock once the
  payload exceeds the pipe buffer (~64 KB). Payloads in the MB range
  must work.
- If the child exits or closes stdin before reading everything (EPIPE /
  broken pipe), that is **not** a `run()` error. The process still ran;
  `exited` resolves as normal. Same "resolving isn't success" rule the
  contract already has for non-zero exits.
- `stdin` containing `\0` is fine: it's data, not argv.

## Explicitly not asked for

- No `handle.write()` / interactive stdin, no PTY, no keeping stdin
  open. The contract's "no interactive process" non-goal stays.
- No binary / `Uint8Array` payload. A string is all mneme needs.
- No env or cwd options. Still no real need.
- No awareness of what the payload means. The capability stays fully
  generic, as the contract's first design question requires.

## What mneme will do with it

`src/features/agent-chat/lib/runTurn.ts`'s `invokeAgent()` passes the
context as `stdin` and keeps only the short task and instructions in
argv, for Claude and Codex. Passthrough / custom agents stay on argv
with the existing size cap, since mneme can't know whether a given CLI
reads stdin. Chat turns stay unchanged in this increment.

## Please update in mneme when done

After the capability lands in chain-sdk, please update mneme's
`@chain/sdk` dependency (`chain update` / reinstall, whatever this app's
normal propagation is) so `desktop.processRunner.run(..., { stdin })`
typechecks here, and confirm `cargo check` for `.chain/native` is clean.
Then send mneme's session the signal to continue.
