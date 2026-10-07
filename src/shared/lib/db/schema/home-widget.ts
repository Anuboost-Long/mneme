import { Column, PrimaryKey, Table } from "@chain/sdk/schema";

// One widget on Home, in the order the user arranged them.
@Table()
export class HomeWidget {
  @PrimaryKey({ autoIncrement: true })
  id!: number;

  // Which widget, a key into features/home/widgets/catalog.
  kind!: string;

  // "small" | "medium" | "wide" | "large".
  size!: string;

  @Column({ default: 0 })
  position!: number;

  // The widget's own settings as JSON: its title, course, filters, note text...
  config!: string | null;

  @Column({ defaultSql: "datetime('now')" })
  created_at!: string;
}

// The name the rest of the app uses for a row of this table.
export type HomeWidgetRow = HomeWidget;
