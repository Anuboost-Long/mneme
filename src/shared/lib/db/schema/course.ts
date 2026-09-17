/**
 * Current shape of the `course` table, column for column, exactly as
 * SQLite returns it — the one place to see the whole table without
 * replaying migration history. Update this whenever a migration in
 * `../migrations` adds, drops, or retypes a column.
 *
 * This is the raw row shape; `features/courses/lib/courses.ts` maps it
 * onto the app-facing `Course` type (e.g. `bookmarked` 0/1 -> boolean).
 */
export interface CourseRow {
  id: number; // INTEGER PRIMARY KEY AUTOINCREMENT
  name: string; // TEXT NOT NULL
  description: string | null; // TEXT
  icon: string | null; // TEXT
  color: string | null; // TEXT
  status: number; // INTEGER NOT NULL DEFAULT 1 (CompletionStatus)      -- 0002
  progress: number; // INTEGER NOT NULL DEFAULT 0 (0-100)               -- 0002
  bookmarked: number; // INTEGER NOT NULL DEFAULT 0 (0 | 1)             -- 0002
  created_at: string; // TEXT NOT NULL DEFAULT (datetime('now'))
  updated_at: string; // TEXT NOT NULL DEFAULT (datetime('now'))
}
