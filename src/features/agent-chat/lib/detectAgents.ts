import { desktop } from "@chain/sdk";
import { presets, type KnownAgent } from "./presets";

export type DetectedAgent = { kind: KnownAgent; installed: boolean };

// A shell alias (e.g. `claude` aliased in .zshrc) is invisible to a
// non-interactive spawn — confirmed on a real machine that Command::new
// resolves a *different* PATH entry than an interactive shell's alias
// does. Spawning for real, not reading shell config, is the only way to
// know what a spawned process would actually find.
async function isInstalled(command: string): Promise<boolean> {
  try {
    const handle = await desktop.processRunner.run(command, ["--version"], () => {});
    await handle.exited;
    return true;
  } catch {
    return false;
  }
}

export async function detectAgents(): Promise<DetectedAgent[]> {
  const known = presets;
  return Promise.all(known.map(async (preset) => ({ kind: preset.value, installed: await isInstalled(preset.command) })));
}
