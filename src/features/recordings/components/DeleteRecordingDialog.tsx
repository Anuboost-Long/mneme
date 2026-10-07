import { deleteRecordingFromPage } from "@/features/courses/lib/page/actions";
import type { RecordingListItem } from "@/features/courses/lib/recording/types";
import ConfirmDeleteDialog from "@/shared/ui/ConfirmDeleteDialog";

export default function DeleteRecordingDialog({
  open,
  recording,
  onClose,
  onDeleted
}: Readonly<{
  open: boolean;
  recording: RecordingListItem | null;
  onClose: () => void;
  onDeleted: () => void;
}>) {
  return (
    <ConfirmDeleteDialog
      open={open}
      title="Delete recording?"
      message={
        !recording
          ? ""
          : recording.page_title === null
            ? `“${recording.name}” and its transcript will be permanently deleted. This can’t be undone.`
            : `“${recording.name}” and its transcript will be permanently deleted, and removed from “${recording.page_title}”. This can’t be undone.`
      }
      confirmLabel="Delete recording"
      failure="Couldn’t delete this recording. Try again."
      onConfirm={async () => {
        if (recording) await deleteRecordingFromPage(recording.id, recording.page_id);
      }}
      onClose={onClose}
      onDeleted={onDeleted}
    />
  );
}
