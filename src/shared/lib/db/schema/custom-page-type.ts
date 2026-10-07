import { Column, PrimaryKey, Table } from "@chain/sdk/schema";

@Table()
export class CustomPageType {
  @PrimaryKey({ autoIncrement: true })
  id!: number;

  name!: string;

  @Column({ default: 0 })
  position!: number;

  @Column({ defaultSql: "datetime('now')" })
  created_at!: string;

  @Column({ defaultSql: "datetime('now')" })
  updated_at!: string;
}

// The name the rest of the app uses for a row of this table.
export type CustomPageTypeRow = CustomPageType;
