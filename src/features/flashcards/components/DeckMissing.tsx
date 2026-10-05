import clsx from "clsx";
import { Link } from "react-router-dom";

import { BodyText, PageTitle } from "../../../shared/ui/Typography";

export default function DeckMissing({ ready }: Readonly<{ ready: boolean }>) {
  if (!ready)
    return (
      <BodyText role="status" tone="muted" className={clsx("p-8")}>
        Opening these flashcards…
      </BodyText>
    );
  return (
    <section className={clsx("p-8 sm:p-14")}>
      <PageTitle>Module not found</PageTitle>
      <BodyText tone="muted" className={clsx("mt-3")}>
        This module may have been deleted. Choose another course from the sidebar.
      </BodyText>
      <Link to="/courses" className={clsx("mt-6 inline-block text-sm underline underline-offset-4")}>
        Back to all courses
      </Link>
    </section>
  );
}
