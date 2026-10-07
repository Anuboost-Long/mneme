import { clearActivity, getRecentActivity } from "@/features/agent-server/lib/activity/actions";
import {
  ActivityOutcome,
  activityOutcomeLabels,
  type AgentActivity as Activity
} from "@/features/agent-server/lib/activity/types";
import ConfirmDeleteDialog from "@/shared/ui/ConfirmDeleteDialog";
import { BodyText, Caption, SectionTitle } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect, useState } from "react";

const SHOWN_ACTIVITY = 50;

const timeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

const formatTime = (createdAt: string) =>
  timeFormat.format(new Date(`${createdAt.replace(" ", "T")}Z`));

export default function AgentActivity() {
  const [items, setItems] = useState<Activity[] | null>(null);
  const [error, setError] = useState("");
  const [clearing, setClearing] = useState(false);

  function load() {
    getRecentActivity(SHOWN_ACTIVITY).then(setItems, () =>
      setError("Couldn’t load the activity. Reopen Settings to try again.")
    );
  }

  useEffect(load, []);

  return (
    <section
      aria-labelledby="agent-activity-title"
      className={clsx("grid gap-6 border-t border-ink/10 py-6 @min-3xl:grid-cols-3")}
    >
      <div>
        <SectionTitle id="agent-activity-title">Activity</SectionTitle>
        <BodyText tone="muted" className={clsx("mt-2 max-w-xs")}>
          Everything an agent read or tried to change, newest first. mneme keeps the last 1,000.
        </BodyText>
        {items !== null && items.length > 0 && (
          <button
            type="button"
            onClick={() => setClearing(true)}
            className={clsx(
              "mt-4 text-sm font-medium underline underline-offset-4",
              "hover:text-muted"
            )}
          >
            Clear activity
          </button>
        )}
      </div>
      <div className={clsx("min-w-0 w-full max-w-xl @min-3xl:col-span-2")}>
        {items?.length === 0 && (
          <BodyText tone="muted">
            No agent activity yet. When an agent reads or changes your pages, it’s listed here.
          </BodyText>
        )}
        {items !== null && items.length > 0 && (
          <ol className={clsx("divide-y divide-ink/10 rounded-md border border-ink/15")}>
            {items.map((item) => (
              <li key={item.id} className={clsx("px-4 py-3")}>
                <p className={clsx("text-sm wrap-anywhere")}>{item.description}</p>
                <Caption
                  tone={item.outcome === ActivityOutcome.Failed ? "error" : "muted"}
                  className={clsx("mt-0.5")}
                >
                  {activityOutcomeLabels[item.outcome]} ·{" "}
                  {item.conversation_title ?? "Outside Chat"} · {formatTime(item.created_at)}
                </Caption>
                {item.detail && (
                  <Caption tone="muted" className={clsx("mt-0.5 wrap-anywhere")}>
                    {item.detail}
                  </Caption>
                )}
              </li>
            ))}
          </ol>
        )}
        {error && (
          <BodyText role="alert" tone="error">
            {error}
          </BodyText>
        )}
      </div>
      <ConfirmDeleteDialog
        open={clearing}
        title="Clear agent activity?"
        message="The whole activity list is deleted. Your pages and conversations stay as they are. This can’t be undone."
        confirmLabel="Clear activity"
        failure="Couldn’t clear the activity. Try again."
        onConfirm={clearActivity}
        onClose={() => setClearing(false)}
        onDeleted={() => {
          setClearing(false);
          setItems([]);
        }}
      />
    </section>
  );
}
