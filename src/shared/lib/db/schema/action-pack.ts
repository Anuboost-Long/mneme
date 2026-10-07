import { Column, Index, PrimaryKey, Table, Trigger } from "@chain/sdk/schema";

@Trigger("action_pack_delete", `CREATE TRIGGER action_pack_delete BEFORE DELETE ON action_pack BEGIN
      DELETE FROM ai_action WHERE pack_id = OLD.id;
    END`)
@Table()
export class ActionPack {
  @PrimaryKey({ autoIncrement: true })
  id!: number;

  @Index({ name: "action_pack_catalog_key", unique: true })
  catalog_key!: string | null;

  name!: string;

  @Column({ default: "" })
  description!: string;

  area!: number | null;

  @Column({ defaultSql: "datetime('now')" })
  installed_at!: string;
}

// The name the rest of the app uses for a row of this table.
export type ActionPackRow = ActionPack;
