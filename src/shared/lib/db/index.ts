import { desktop } from "@chain/sdk";
import { migrations } from "./migrations";

export function initDb(): Promise<void> {
  return desktop.storage.migrate(migrations);
}

// Re-exports every table's current row shape — see `./schema`.
export type * from "./schema";
