import { useEffect, useState } from "react";

import { useCourses } from "../features/courses/lib/coursesState";
import { getAllRecordings } from "../features/courses/lib/recording/actions";
import type { RecordingListItem } from "../features/courses/lib/recording/types";
import RecordingsPage from "../features/recordings/pages/RecordingsPage";

export default function RecordingsRoute() {
  const { courses } = useCourses();
  const [recordings, setRecordings] = useState<RecordingListItem[] | null>(null);

  useEffect(() => {
    let active = true;
    getAllRecordings()
      .then((loaded) => active && setRecordings(loaded))
      .catch(() => active && setRecordings([]));
    return () => {
      active = false;
    };
  }, []);

  return (
    <RecordingsPage
      recordings={recordings}
      courses={courses}
      onChange={(changed) =>
        setRecordings(
          (current) => current?.map((item) => (item.id === changed.id ? changed : item)) ?? null
        )
      }
      onDelete={(id) =>
        setRecordings((current) => current?.filter((item) => item.id !== id) ?? null)
      }
    />
  );
}
