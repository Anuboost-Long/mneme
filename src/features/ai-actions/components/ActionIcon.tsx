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
  cards: "M8 4h11a1 1 0 0 1 1 1v11M5 8h11a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z",
  mic: "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3ZM5 11a7 7 0 0 0 14 0M12 18v3",
  question: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14M12 17h.01",
  pencil: "M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4ZM13.5 6.5l4 4",
  calculator: "M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01",
  chart: "M4 4v16h16M8 16v-5M12 16V8M16 16v-3",
  flask: "M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3M7 15h10",
  leaf: "M6 20c-1-9 4-15 14-15 0 10-5 15-14 15ZM6 20l8-8",
  heart: "M12 20s-7-4.4-9-9a4.5 4.5 0 0 1 9-3 4.5 4.5 0 0 1 9 3c-2 4.6-9 9-9 9Z",
  code: "m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14",
  briefcase: "M4 7h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1ZM9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18",
  landmark: "M3 21h18M4 10h16M12 3l9 5H3l9-5ZM6 10v8M10 10v8M14 10v8M18 10v8",
  quote: "M9 7H5v6h4c0 2-1 3-3 4M19 7h-4v6h4c0 2-1 3-3 4",
  scales: "M12 4v16M8 20h8M5 7h14M5 7l-3 6a3 3 0 0 0 6 0L5 7ZM19 7l-3 6a3 3 0 0 0 6 0l-3-6Z",
  music: "M9 18V5l11-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  palette: "M12 3a9 9 0 1 0 0 18c1.1 0 2-.9 2-2 0-.5-.2-1-.5-1.3-.3-.4-.5-.8-.5-1.2 0-1.1.9-2 2-2h2.5A4.5 4.5 0 0 0 21 10c0-3.9-4-7-9-7ZM7.5 11h.01M10 7h.01M15 7h.01",
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
  cards: "Cards",
  mic: "Microphone",
  question: "Question",
  pencil: "Pencil",
  calculator: "Calculator",
  chart: "Chart",
  flask: "Flask",
  leaf: "Leaf",
  heart: "Heart",
  code: "Code",
  briefcase: "Briefcase",
  landmark: "Landmark",
  quote: "Quote",
  scales: "Scales",
  music: "Music",
  palette: "Palette",
};

export default function ActionIcon({ icon }: Readonly<{ icon: string | null }>) {
  const path = icon ? paths[icon] : undefined;
  if (!path) return null;
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0"><path d={path} /></svg>
  );
}
