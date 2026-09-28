import { Column, ForeignKey, PrimaryKey, Table } from "@chain/sdk/schema";
import { AiProfile } from "./ai-profile";

@Table()
export class Course {
  @PrimaryKey({ autoIncrement: true })
  id!: number;

  name!: string;

  description!: string | null;

  icon!: string | null;

  color!: string | null;

  @Column({ defaultSql: "datetime('now')" })
  created_at!: string;

  @Column({ defaultSql: "datetime('now')" })
  updated_at!: string;

  @Column({ default: 1 })
  status!: number;

  @Column({ default: 0 })
  progress!: number;

  @Column({ default: 0 })
  bookmarked!: number;

  @ForeignKey(() => AiProfile, { onDelete: "set null" })
  ai_profile_id!: number | null;
}

// The name the rest of the app uses for a row of this table.
export type CourseRow = Course;
