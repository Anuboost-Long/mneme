/**
 * Current shape of the `settings` table. No app code reads/writes this
 * yet (in-app settings currently live in localStorage) — kept here so
 * the whole database is visible in one place. See `./course.ts` for the
 * file's conventions.
 */
export interface SettingsRow {
  key: string; // TEXT PRIMARY KEY
  value: string | null; // TEXT
}
