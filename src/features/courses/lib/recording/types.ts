import type { RecordingRow } from "../../../../shared/lib/db/schema/recording";

export type Recording = RecordingRow;

export type RecordingListItem = Recording & {
  page_title: string;
  module_id: number;
  module_name: string;
  course_id: number;
  course_name: string;
  course_color: string | null;
};
