/**
 * Current shape of the `attachment` table. No app code reads/writes this
 * yet — it exists for a later phase; kept here so the whole database is
 * visible in one place. See `./course.ts` for the file's conventions.
 */
export interface AttachmentRow {
  id: number; // INTEGER PRIMARY KEY AUTOINCREMENT
  page_id: number; // INTEGER NOT NULL
  file_name: string; // TEXT NOT NULL
  file_path: string; // TEXT NOT NULL
  mime_type: string | null; // TEXT
  created_at: string; // TEXT NOT NULL DEFAULT (datetime('now'))
}
