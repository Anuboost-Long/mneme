import clsx from "clsx";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { timeAgo } from "../../../shared/lib/date";
import { DATE_GROUP_VALUES, groupByDate, type DateGroupBy } from "../../../shared/lib/dateGroups";
import { useLastValue } from "../../../shared/lib/dialogState";
import { formatDuration } from "../../../shared/lib/formatDuration";
import { useListView, type SortOption } from "../../../shared/lib/useListView";
import { useStoredChoice } from "../../../shared/lib/useStoredChoice";
import ListToolbar from "../../../shared/ui/ListToolbar";
import { BodyText, Caption, PageTitle } from "../../../shared/ui/Typography";
import type { Course } from "../../courses/lib/course/types";
import type { RecordingListItem } from "../../courses/lib/recording/types";
import DeleteRecordingDialog from "../components/DeleteRecordingDialog";
import RecordingBar from "../components/RecordingBar";
import RecordingDetails from "../components/RecordingDetails";

type SortKey = "newest" | "oldest" | "longest" | "name";

const SORTS: SortOption<RecordingListItem, SortKey>[] = [
  { value: "newest", label: "Newest", compare: (a, b) => b.created_at.localeCompare(a.created_at) },
  { value: "oldest", label: "Oldest", compare: (a, b) => a.created_at.localeCompare(b.created_at) },
  { value: "longest", label: "Longest", compare: (a, b) => b.duration_ms - a.duration_ms },
  { value: "name", label: "Name", compare: (a, b) => a.name.localeCompare(b.name) }
];

function matches(recording: RecordingListItem, query: string) {
  return [
    recording.name,
    recording.page_title ?? "",
    recording.module_name ?? "",
    recording.course_name ?? "",
    recording.transcript ?? ""
  ].some((text) => text.toLowerCase().includes(query));
}

// Stored dates are UTC without a zone; dateGroups reads ISO strings.
const isoDate = (stored: string) =>
  stored.includes("T") ? stored : `${stored.replace(" ", "T")}Z`;

export default function RecordingsPage({
  recordings,
  courses,
  onChange,
  onReload,
  onDelete
}: Readonly<{
  recordings: RecordingListItem[] | null;
  courses: Course[];
  onChange: (recording: RecordingListItem) => void;
  onReload: () => void;
  onDelete: (id: number) => void;
}>) {
  const [courseFilter, setCourseFilter] = useState("all");
  const [groupBy, setGroupBy] = useStoredChoice<DateGroupBy>(
    "mneme.recordings.group",
    DATE_GROUP_VALUES,
    "month"
  );
  const [openId, setOpenId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<RecordingListItem | null>(null);
  const deletingRecording = useLastValue(deleting);
  const routeState = useLocation().state as { openRecordingId?: number } | null;
  const navigate = useNavigate();
  useEffect(() => {
    const id = routeState?.openRecordingId;
    if (!id) return;
    navigate(".", { replace: true, state: null });
    setOpenId(id);
  }, [routeState]);
  const filtered = (recordings ?? []).filter(
    (recording) =>
      courseFilter === "all" ||
      (courseFilter === "none"
        ? recording.page_id === null
        : String(recording.course_id) === courseFilter)
  );
  const { query, setQuery, sortValue, setSortValue, visible } = useListView(
    filtered,
    matches,
    SORTS,
    "mneme.recordings.sort"
  );
  const groups = groupByDate(
    visible,
    (recording) => isoDate(recording.created_at),
    groupBy,
    sortValue === "oldest" ? "oldest" : "newest"
  );
  const totalMs = (recordings ?? []).reduce((sum, recording) => sum + recording.duration_ms, 0);

  return (
    <div className={clsx("w-full px-4 py-5 sm:px-6")}>
      <PageTitle>Recordings</PageTitle>
      <BodyText tone="muted" className={clsx("mt-1")}>
        {recordings?.length
          ? `${recordings.length} ${recordings.length === 1 ? "recording" : "recordings"} · ${formatDuration(totalMs)} in all. Play, transcribe, add to a page or delete them here.`
          : "Record a lecture or a note here. Recordings from pages and Home collect here too."}
      </BodyText>
      <RecordingBar onSaved={onReload} />

      {recordings && recordings.length > 0 && (
        <>
          <ListToolbar
            query={query}
            onQueryChange={setQuery}
            searchPlaceholder="Search names, pages and transcripts…"
            filterLabel="Course"
            filterValue={courseFilter}
            onFilterChange={setCourseFilter}
            filterOptions={[
              { value: "all", label: "All courses" },
              { value: "none", label: "Not on a page" },
              ...courses.map((course) => ({ value: String(course.id), label: course.name }))
            ]}
            sortValue={sortValue}
            onSortChange={setSortValue}
            sortOptions={SORTS}
            groupBy={groupBy}
            onGroupByChange={setGroupBy}
            className={clsx("mt-5")}
          />
          {visible.length === 0 ? (
            <BodyText tone="muted" className={clsx("mt-8 text-center")}>
              No recordings match your search or filter.
            </BodyText>
          ) : (
            <div className={clsx("mt-4 space-y-6")}>
              {groups.map((group) => (
                <section key={group.key} aria-label={group.label || "Recordings"}>
                  {group.label && (
                    <Caption tone="muted" className={clsx("mb-2 font-medium")}>
                      {group.label}
                    </Caption>
                  )}
                  <ul className={clsx("divide-y divide-ink/10 rounded-lg", "border border-ink/10")}>
                    {group.items.map((recording) => {
                      const open = recording.id === openId;
                      return (
                        <li key={recording.id} className={clsx(open && "bg-ink/2")}>
                          <div className={clsx("flex items-center pr-2")}>
                            <button
                              type="button"
                              aria-expanded={open}
                              onClick={() => setOpenId(open ? null : recording.id)}
                              className={clsx(
                                "flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left",
                                "hover:bg-ink/4 focus-visible:bg-ink/4 focus-visible:outline-none"
                              )}
                            >
                              <svg
                                className={clsx("size-4 shrink-0 text-muted")}
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <rect x="9" y="3" width="6" height="11" rx="3" />
                                <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                              </svg>
                              <span className={clsx("min-w-0 flex-1")}>
                                <span className={clsx("block truncate text-sm font-medium")}>
                                  {recording.name}
                                </span>
                                <Caption as="span" tone="muted" className={clsx("block truncate")}>
                                  {recording.page_title === null
                                    ? "Not on a page yet"
                                    : `${recording.page_title} · ${recording.course_name} › ${recording.module_name}`}
                                </Caption>
                              </span>
                              {recording.transcript && (
                                <Caption
                                  as="span"
                                  tone="muted"
                                  className={clsx("hidden rounded-sm px-1.5 sm:inline", "bg-ink/6")}
                                >
                                  Transcript
                                </Caption>
                              )}
                              <Caption
                                as="span"
                                tone="muted"
                                className={clsx("w-14 shrink-0 text-right tabular-nums")}
                              >
                                {formatDuration(recording.duration_ms)}
                              </Caption>
                              <Caption
                                as="span"
                                tone="muted"
                                className={clsx("hidden w-24 shrink-0 text-right sm:block")}
                              >
                                {timeAgo(recording.created_at)}
                              </Caption>
                              <svg
                                className={clsx(
                                  "size-4 shrink-0 text-muted transition-transform motion-reduce:transition-none",
                                  open && "rotate-180"
                                )}
                                viewBox="0 0 16 16"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="m4 6 4 4 4-4" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleting(recording)}
                              aria-label={`Delete ${recording.name}`}
                              title="Delete"
                              className={clsx(
                                "grid size-8 shrink-0 place-items-center rounded-md text-muted",
                                "hover:bg-danger/10 hover:text-danger focus-visible:outline-2 focus-visible:outline-danger"
                              )}
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                aria-hidden="true"
                              >
                                <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                              </svg>
                            </button>
                          </div>
                          {open && (
                            <RecordingDetails
                              recording={recording}
                              onTranscribed={(transcript) => onChange({ ...recording, transcript })}
                              onPlaced={onReload}
                            />
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </>
      )}
      <DeleteRecordingDialog
        open={deleting !== null}
        recording={deletingRecording}
        onClose={() => setDeleting(null)}
        onDeleted={() => {
          if (deletingRecording) {
            if (openId === deletingRecording.id) setOpenId(null);
            onDelete(deletingRecording.id);
          }
          setDeleting(null);
        }}
      />
    </div>
  );
}
