import { Column, Index, PrimaryKey, Table } from "@chain/sdk/schema";

@Table()
export class Task {
  @PrimaryKey({ autoIncrement: true })
  id!: number;

  title!: string;

  // TaskType: 1 Exercise, 2 Discussion, 3 Assignment, 4 Quiz, 5 Personal.
  @Column({ default: 5 })
  type!: number;

  @Index({ name: "task_course" })
  course_id!: number | null;

  @Index({ name: "task_module" })
  module_id!: number | null;

  // The imported page the task came from, if any.
  page_id!: number | null;

  // A calendar date, YYYY-MM-DD.
  @Index({ name: "task_due" })
  due_on!: string | null;

  completed_at!: string | null;

  @Column({ defaultSql: "datetime('now')" })
  created_at!: string;

  @Column({ defaultSql: "datetime('now')" })
  updated_at!: string;
}

// The name the rest of the app uses for a row of this table.
export type TaskRow = Task;
