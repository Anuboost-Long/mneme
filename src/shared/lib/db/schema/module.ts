import { Column, PrimaryKey, Table } from "@chain/sdk/schema";

@Table()
export class Module {
  @PrimaryKey({ autoIncrement: true })
  id!: number;

  course_id!: number;

  name!: string;

  description!: string | null;

  @Column({ defaultSql: "datetime('now')" })
  created_at!: string;

  @Column({ defaultSql: "datetime('now')" })
  updated_at!: string;

  @Column({ default: 0 })
  progress!: number;

  @Column({ default: 0 })
  bookmarked!: number;

  @Column({ default: 1 })
  status!: number;
}

// The name the rest of the app uses for a row of this table.
export type ModuleRow = Module;
