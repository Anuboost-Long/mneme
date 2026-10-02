import type { AttachmentRow } from "../../../../shared/lib/db/schema/attachment";
import type { CourseRow } from "../../../../shared/lib/db/schema/course";
import type { ModuleRow } from "../../../../shared/lib/db/schema/module";
import type { PageRow } from "../../../../shared/lib/db/schema/page";
import type { RecordingRow } from "../../../../shared/lib/db/schema/recording";

export type Backup = {
  version: 1 | 2;
  exportedAt: string;
  courses: CourseRow[];
  modules: ModuleRow[];
  pages: PageRow[];
  attachments?: AttachmentRow[];
  recordings?: RecordingRow[];
  files?: Record<string, Uint8Array>;
};
