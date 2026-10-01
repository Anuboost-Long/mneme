import { Column, PrimaryKey, Table } from "@chain/sdk/schema";

@Table()
export class Settings {
  @PrimaryKey()
  key!: string | null;

  value!: string | null;

  @Column({ defaultSql: "datetime('now')" })
  created_at!: string;

  @Column({ defaultSql: "datetime('now')" })
  updated_at!: string;
}

// The name the rest of the app uses for a row of this table.
export type SettingsRow = Settings;
