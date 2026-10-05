import clsx from "clsx";
import { useLastValue } from "../../../shared/lib/dialogState";
import Dialog from "../../../shared/ui/Dialog";
import { BodyText, Caption } from "../../../shared/ui/Typography";
import { answerApproval } from "../lib/approvals";
import { usePendingApproval } from "../lib/usePendingApproval";

export default function ApprovalPrompt() {
  const pending = usePendingApproval();
  const shown = useLastValue(pending);

  return (
    <Dialog open={pending !== null} title="Agent wants to make a change" onClose={() => answerApproval(false)}>
      {(_close, complete) => <>
        <BodyText>{shown?.description}</BodyText>
        <Caption tone="muted" className={clsx("mt-2")}>Approving lets this conversation's agent do this kind of thing again without asking.</Caption>
        <div className={clsx("mt-6 flex justify-end gap-3 border-t border-ink/10 pt-5")}>
          <button type="button" onClick={() => complete(() => answerApproval(false))} className={clsx("rounded-md border border-ink/15 px-3 py-2 text-sm", "hover:bg-ink/5")}>Deny</button>
          <button type="button" onClick={() => complete(() => answerApproval(true))} className={clsx("rounded-md bg-action px-3 py-2 text-sm text-on-action", "hover:opacity-80")}>Approve</button>
        </div>
      </>}
    </Dialog>
  );
}
