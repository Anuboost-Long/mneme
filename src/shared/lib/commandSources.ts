export type PaletteCommand = { id: string; label: string; detail?: string; run: () => void };

export type CommandSource = { group: string; load: () => Promise<PaletteCommand[]> };

const sources = new Set<CommandSource>();

export function addCommandSource(source: CommandSource) {
  sources.add(source);
  return () => { sources.delete(source); };
}

export async function loadCommandGroups() {
  return Promise.all([...sources].map(async (source) => ({ group: source.group, commands: await source.load() })));
}

export async function runCommand(id: string) {
  for (const { commands } of await loadCommandGroups()) {
    const command = commands.find((item) => item.id === id);
    if (command) {
      command.run();
      return true;
    }
  }
  return false;
}
