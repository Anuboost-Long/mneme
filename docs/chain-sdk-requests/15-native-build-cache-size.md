# Capability Request 15 — Keep `.chain/native/target` from growing to gigabytes

Source: measured in mneme on 28 September 2026. It's not a runtime
capability. It's about chain-sdk's native template (`Cargo.toml`) and the
`chain dev`/`chain build` CLI. **If chain-sdk already does any step below
(the peer session reported working on Rust build size), skip it. Just
say which ones were already done.**

## Status — 28 September 2026

Steps 1, 2 and 5 landed in chain-sdk. Step 4 needed no change. **Step 3
(pruning / `chain clean`) is still open.** mneme ran `chain update`
(kept its local `chain-core` path over the template's git rev) and
`cargo clean` once. `.chain/` is now 1.2 MB. Dev builds live in
`~/Library/Caches/chain/target`.

## What was measured

`.chain/` is **6.2 GB**, and 6.2 GB of that is `.chain/native/target/`.
The source, config and icons are under 1 MB. The finished `.app` bundle
is 15 MB.

| Path | Size | What it is |
|---|---|---|
| `target/debug/deps` | 3.6 GB | Dev-build artifacts. About **1.7 GB** are older duplicate builds of the same crates (6 hashes of `tauri_utils`, 7 old `mneme` binaries, ...) |
| `target/debug/incremental` | 548 MB | 9 `mneme_lib` sessions, only 1 current |
| `target/debug/build` | 517 MB | Build-script output, duplicated per rebuild |
| `target/debug/libmneme_lib.a` | 369 MB | `staticlib` output, used only by iOS |
| `target/aarch64-apple-darwin` + `target/release` | 1.1 GB | `chain build` / `build:mac` caches |

Toolchain: rustc/cargo 1.98.1. Stable cargo has **no target-dir GC**:
`-Z gc` is nightly-only and covers `~/.cargo` caches only.

### Root causes

1. **Cargo never removes stale artifacts.** Each change to features
   (for example `--features chain-dev-inspector` in dev but not in
   build), to `chain-core` (a path dependency) or to the profile
   produces new hashes. The old ones stay forever.
2. **Full debuginfo for every dependency** in the dev profile. That's
   about 10× the release size.
3. **`crate-type = ["staticlib", "cdylib", "rlib"]`** comes from
   create-tauri-app's mobile-ready default. Desktop needs only `rlib`
   (the bin links it). Every dev build writes a 369 MB `.a` and a
   dylib too.

## Suggested changes (in priority order)

1. **Dev profile debuginfo** in the native `Cargo.toml` template:
   ```toml
   [profile.dev]
   debug = "line-tables-only"

   [profile.dev.package."*"]
   debug = false
   ```
   App crates keep line numbers for backtraces, and dependencies drop
   debuginfo entirely. That's typically a ~40–60% smaller `debug/`, not
   yet measured here, so please measure it. It's also a faster link.
2. **Desktop-only crate type:** `crate-type = ["rlib"]` until an app
   opts into mobile. That removes the `.a`/dylib outputs. Keep the
   `_lib` naming. Check that `tauri dev`/`build` don't expect the
   cdylib on desktop.
3. **Automatic pruning in the CLI.** For example, `chain dev`/`chain
   build` could delete `target/` artifacts not touched in N days (what
   `cargo sweep --time N` does), or only the oldest duplicate hashes
   per crate. Or add an explicit `chain clean` (wrapping `cargo clean`
   with `TAURI_APP_PATH`/manifest path resolved). Either one, plus a
   one-line size hint when `target/` exceeds a threshold, would do.
4. **Fewer hash splits:** check whether `chain dev`'s
   `--features chain-dev-inspector` versus `chain build`'s no-features
   build forces a full second dependency graph. If only the app crate
   differs, that's fine. If deps get rebuilt, consider it.
5. **Optional: a shared target dir** across Chain apps
   (`CARGO_TARGET_DIR`, opt-in). Tauri and the other deps then compile
   once per machine instead of once per app. It moves the cache outside
   the project, so it has to be opt-in, not a default.

## Explicitly not asked for

- Nothing that changes release-build output or `[profile.release]`
  (already `lto`/`strip`/`codegen-units = 1`).
- No deleting anything in apps without the user running a command.

## Please update in mneme when done

Ship the template changes so `chain update` merges them into mneme's
`.chain/native/Cargo.toml`, tell mneme's session (`mneme-2c`) which
steps landed and which were already in place, and whether mneme should
run `cargo clean` once to drop the existing 6 GB.
