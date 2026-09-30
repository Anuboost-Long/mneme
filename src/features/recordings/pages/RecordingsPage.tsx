import clsx from "clsx";
import { useState } from "react";

import { timeAgo } from "../../../shared/lib/date";
import { DATE_GROUP_VALUES, groupByDate, type DateGroupBy } from "../../../shared/lib/dateGroups";
import { formatDuration } from "../../../shared/lib/formatDuration";
import { useListView, type SortOption } from "../../../shared/lib/useListView";
import { useStoredChoice } from "../../../shared/lib/useStoredChoice";
import ListToolbar from "../../../shared/ui/ListToolbar";
import { BodyText, Caption, PageTitle } from "../../../shared/ui/Typography";
import type { Course } from "../../courses/lib/courses";
import type { RecordingListItem } from "../../courses/lib/recordings";
import RecordingDetails from "../components/RecordingDetails";

type SortKey = "newest" | "oldest" | "longest" | "name";

const SORTS: SortOption<RecordingListItem, SortKey>[] = [
  { value: "newest", label: "Newest", compare: (a, b) => b.created_at.localeCompare(a.created_at) },
  { value: "oldest", label: "Oldest", compare: (a, b) => a.created_at.localeCompare(b.created_at) },
  { value: "longest", label: "Longest", compare: (a, b) => b.duration_ms - a.duration_ms },
  { value: "name", label: "Name", compare: (a, b) => a.name.localeCompare(b.name) }
];

function matches(recording: RecordingListItem, query: string) {
  return [recording.name, recording.page_title, recording.module_name, recording.course_name, recording.transcript ?? ""].some((text) =>
    text.toLowerCase().includes(query)
  );
}

// Stored dates are UTC without a zone; dateGroups reads ISO strings.
const isoDate = (stored: string) => (stored.includes("T") ? stored : `${stored.replace(" ", "T")}Z`);

export default function RecordingsPage({ recordings, courses, onChange, onDelete }: Readonly<{
  recordings: RecordingListItem[] | null;
  courses: Course[];
  onChange: (recording: RecordingListItem) => void;
  onDelete: (id: number) => void;
}>) {
  const [courseFilter, setCourseFilter] = useState("all");
  const [groupBy, setGroupBy] = useStoredChoice<DateGroupBy>("mneme.recordings.group", DATE_GROUP_VALUES, "month");
  const [openId, setOpenId] = useState<number | null>(null);
  const filtered = (recordings ?? []).filter((recording) => courseFilter === "all" || String(recording.course_id) === courseFilter);
  const { query, setQuery, sortValue, setSortValue, visible } = useListView(filtered, matches, SORTS, "mneme.recordings.sort");
  const groups = groupByDate(visible, (recording) => isoDate(recording.created_at), groupBy, sortValue === "oldest" ? "oldest" : "newest");
  const totalMs = (recordings ?? []).reduce((sum, recording) => sum + recording.duration_ms, 0);

  return (
    <div className={clsx("w-full px-4 py-5 sm:px-6")}>
      <PageTitle>Recordings</PageTitle>
      <BodyText tone="muted" className={clsx("mt-1")}>
        {recordings?.length ? `${recordings.length} ${recordings.length === 1 ? "recording" : "recordings"} · ${formatDuration(totalMs)} in all. Play, transcribe or delete them here.` : "Lectures and notes you record, on pages or from Home, collect here."}
      </BodyText>

      {recordings && recordings.length > 0 && (
        <>
          <ListToolbar
            query={query} onQueryChange={setQuery} searchPlaceholder="Search names, pages and transcripts…"
            filterLabel="Course" filterValue={courseFilter} onFilterChange={setCourseFilter}
            filterOptions={[{ value: "all", label: "All courses" }, ...courses.map((course) => ({ value: String(course.id), label: course.name }))]}
            sortValue={sortValue} onSortChange={setSortValue} sortOptions={SORTS}
            groupBy={groupBy} onGroupByChange={setGroupBy}
            className={clsx("mt-5")}
          />
          {visible.length === 0 ? (
            <BodyText tone="muted" className={clsx("mt-8 text-center")}>No recordings match your search or filter.</BodyText>
          ) : (
            <div className={clsx("mt-4 space-y-6")}>
              {groups.map((group) => (
                <section key={group.key} aria-label={group.label || "Recordings"}>
                  {group.label && <Caption tone="muted" className={clsx("mb-2 font-medium")}>{group.label}</Caption>}
                  <ul className={clsx("divide-y divide-ink/10 rounded-lg", "border border-ink/10")}>
                    {group.items.map((recording) => {
                      const open = recording.id === openId;
                      return (
                        <li key={recording.id} className={clsx(open && "bg-ink/2")}>
                          <button
                            type="button"
                            aria-expanded={open}
                            onClick={() => setOpenId(open ? null : recording.id)}
                            className={clsx("flex w-full items-center gap-3 px-3 py-2.5 text-left", "hover:bg-ink/4 focus-visible:bg-ink/4 focus-visible:outline-none")}
                          >
                            <svg className={clsx("size-4 shrink-0 text-muted")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <rect x="9" y="3" width="6" height="11" rx="3" />
                              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                            </svg>
                            <span className={clsx("min-w-0 flex-1")}>
                              <span className={clsx("block truncate text-sm font-medium")}>{recording.name}</span>
                              <Caption as="span" tone="muted" className={clsx("block truncate")}>
                                {recording.page_title} · {recording.course_name} › {recording.module_name}
                              </Caption>
                            </span>
                            {recording.transcript && <Caption as="span" tone="muted" className={clsx("hidden rounded-sm px-1.5 sm:inline", "bg-ink/6")}>Transcript</Caption>}
                            <Caption as="span" tone="muted" className={clsx("w-14 shrink-0 text-right tabular-nums")}>{formatDuration(recording.duration_ms)}</Caption>
                            <Caption as="span" tone="muted" className={clsx("hidden w-24 shrink-0 text-right sm:block")}>{timeAgo(recording.created_at)}</Caption>
                            <svg className={clsx("size-4 shrink-0 text-muted transition-transform motion-reduce:transition-none", open && "rotate-180")} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="m4 6 4 4 4-4" />
                            </svg>
                          </button>
                          {open && (
                            <RecordingDetails
                              recording={recording}
                              onTranscribed={(transcript) => onChange({ ...recording, transcript })}
                              onDeleted={() => {
                                setOpenId(null);
                                onDelete(recording.id);
                              }}
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
    </div>
  );
}
