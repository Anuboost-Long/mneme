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

  // A `desktop.files` reference to the cover image, never a path.
  cover!: string | null;

  // Order in lists; ties fall back to creation order.
  @Column({ default: 0 })
  position!: number;

  code!: string | null;

  semester!: string | null;

  school!: string | null;

  instructor!: string | null;
}

// The name the rest of the app uses for a row of this table.
export type CourseRow = Course;
