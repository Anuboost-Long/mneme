import { useEffect, useState } from "react";
import { getAllRecordings, type RecordingListItem } from "../features/courses/lib/recordings";
import RecordingsPage from "../features/recordings/pages/RecordingsPage";
import { useCourses } from "../layouts/RootLayout";

export default function RecordingsRoute() {
  const { courses } = useCourses();
  const [recordings, setRecordings] = useState<RecordingListItem[] | null>(null);

  useEffect(() => {
    let active = true;
    getAllRecordings()
      .then((loaded) => active && setRecordings(loaded))
      .catch(() => active && setRecordings([]));
    return () => { active = false; };
  }, []);

  return (
    <RecordingsPage
      recordings={recordings}
      courses={courses}
      onChange={(changed) => setRecordings((current) => current?.map((item) => (item.id === changed.id ? changed : item)) ?? null)}
      onDelete={(id) => setRecordings((current) => current?.filter((item) => item.id !== id) ?? null)}
    />
  );
}
