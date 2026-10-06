import type { AttachmentRow } from "@/shared/lib/db/schema/attachment";

export type Attachment = AttachmentRow;

export type AttachmentLink = {
  id: number;
  file_name: string;
  page_id: number;
  page_title: string;
  module_id: number;
  course_id: number;
};
