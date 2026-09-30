import { Column, PrimaryKey, Table } from "@chain/sdk/schema";

// Study activity per local day, for Home's streak and activity widgets.
// Counts only, so deleting a page leaves nothing behind here.
@Table()
export class StudyDay {
  // "YYYY-MM-DD" in the user's local time.
  @PrimaryKey()
  day!: string;

  @Column({ default: 0 })
  opened!: number;

  @Column({ default: 0 })
  completed!: number;
}

// The name the rest of the app uses for a row of this table.
export type StudyDayRow = StudyDay;
