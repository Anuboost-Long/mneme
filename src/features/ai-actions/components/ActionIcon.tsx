// The icon an action shows in the AI actions menu — a fixed set, the same
// approach as shared/ui/CourseIcon's courseIcons. Stored by key in
// ai_action.icon; an unknown or null key renders nothing.
const paths: Record<string, string> = {
  sparkle: "M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.1 2.1M15.6 15.6l2.1 2.1M6.3 17.7l2.1-2.1M15.6 8.4l2.1-2.1",
  summary: "M4 6h16M4 10h16M4 14h10M4 18h6",
  idea: "M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3Z",
  translate: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z",
  checklist: "m4 6 1.5 1.5L8 5M4 12l1.5 1.5L8 11M4 18l1.5 1.5L8 17M11 6h9M11 12h9M11 18h9",
  discussion: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z",
  study: "M12 5C9 3 5 3 3 4v15c3-1 6-1 9 1m0-15c3-2 7-2 9-1v15c-3-1-6-1-9 1V5Z",
};

export const actionIcons = Object.keys(paths);

export const actionIconLabels: Record<string, string> = {
  sparkle: "Sparkle",
  summary: "Summary",
  idea: "Idea",
  translate: "Globe",
  checklist: "Checklist",
  discussion: "Discussion",
  study: "Book",
};

export default function ActionIcon({ icon }: Readonly<{ icon: string | null }>) {
  const path = icon ? paths[icon] : undefined;
  if (!path) return null;
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0"><path d={path} /></svg>
  );
}
