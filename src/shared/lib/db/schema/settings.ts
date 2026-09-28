import { PrimaryKey, Table } from "@chain/sdk/schema";

@Table()
export class Settings {
  @PrimaryKey()
  key!: string | null;

  value!: string | null;
}

// The name the rest of the app uses for a row of this table.
export type SettingsRow = Settings;
