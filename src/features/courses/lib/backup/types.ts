import type { AttachmentRow } from "../../../../shared/lib/db/schema/attachment";
import type { CourseRow } from "../../../../shared/lib/db/schema/course";
import type { CustomPageTypeRow } from "../../../../shared/lib/db/schema/custom-page-type";
import type { FlashcardRow } from "../../../../shared/lib/db/schema/flashcard";
import type { HomeLayoutRow } from "../../../../shared/lib/db/schema/home-layout";
import type { HomeWidgetRow } from "../../../../shared/lib/db/schema/home-widget";
import type { ModuleRow } from "../../../../shared/lib/db/schema/module";
import type { PageRow } from "../../../../shared/lib/db/schema/page";
import type { RecordingRow } from "../../../../shared/lib/db/schema/recording";
import type { TaskRow } from "../../../../shared/lib/db/schema/task";

export type Backup = {
  version: 1 | 2;
  exportedAt: string;
  courses: CourseRow[];
  modules: ModuleRow[];
  pages: PageRow[];
  attachments?: AttachmentRow[];
  recordings?: RecordingRow[];
  widgets?: HomeWidgetRow[];
  layouts?: HomeLayoutRow[];
  pageTypes?: CustomPageTypeRow[];
  flashcards?: FlashcardRow[];
  tasks?: TaskRow[];
  files?: Record<string, Uint8Array>;
};
