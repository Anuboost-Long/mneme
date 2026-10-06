import { answerApproval } from "@/features/agent-server/lib/approvals";
import { permissionDetails } from "@/features/agent-server/lib/permissions";
import { usePendingApproval } from "@/features/agent-server/lib/usePendingApproval";
import { useLastValue } from "@/shared/lib/dialogState";
import Dialog from "@/shared/ui/Dialog";
import { BodyText, Caption } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect, useState } from "react";

export default function ApprovalPrompt() {
  const pending = usePendingApproval();
  const shown = useLastValue(pending);
  const [always, setAlways] = useState(false);
  const action = shown ? permissionDetails[shown.permission].action : undefined;

  useEffect(() => {
    if (pending) setAlways(false);
  }, [pending]);

  return (
    <Dialog
      open={pending !== null}
      title="Agent wants to make a change"
      onClose={() => answerApproval(false)}
    >
      {(_close, complete) => (
        <>
          <BodyText>{shown?.description}</BodyText>
          {shown?.canAlwaysAllow && action ? (
            <label className={clsx("mt-4 flex cursor-pointer items-start gap-3 text-sm")}>
              <input
                type="checkbox"
                checked={always}
                onChange={(event) => setAlways(event.target.checked)}
                className={clsx("mt-0.5 accent-current")}
              />
              <span>
                Always allow the agent to {action}
                <Caption as="span" tone="muted" className={clsx("block")}>
                  Change this any time in Settings → Agent tools.
                </Caption>
              </span>
            </label>
          ) : (
            <Caption tone="muted" className={clsx("mt-2")}>
              This replaces what’s on the page, so mneme asks every time.
            </Caption>
          )}
          <div className={clsx("mt-6 flex justify-end gap-3 border-t border-ink/10 pt-5")}>
            <button
              type="button"
              onClick={() => complete(() => answerApproval(false))}
              className={clsx(
                "rounded-md border border-ink/15 px-3 py-2 text-sm",
                "hover:bg-ink/5"
              )}
            >
              Deny
            </button>
            <button
              type="button"
              onClick={() => complete(() => answerApproval(true, always))}
              className={clsx(
                "rounded-md bg-action px-3 py-2 text-sm text-on-action",
                "hover:opacity-80"
              )}
            >
              Allow
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
