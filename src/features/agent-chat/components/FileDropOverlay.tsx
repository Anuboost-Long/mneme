import clsx from "clsx";
import { BodyText, SectionTitle } from "../../../shared/ui/Typography";

const tiles = [
  { label: "Text", path: "M6 7h8M6 10h8M6 13h5" },
  { label: "PDF", path: "M5 4h7l3 3v9H5zM12 4v3h3" },
  { label: "Image", path: "M4 5h12v10H4zM4 13l3.5-3.5 3 3 2-2L16 14" },
];

// Stays mounted so it can fade out as well as in; `visible` drives the
// .file-drop-overlay transitions in App.css. pointer-events-none keeps the
// drag events on the conversation underneath, which owns the drop.
export default function FileDropOverlay({ visible }: Readonly<{ visible: boolean }>) {
  return <div aria-hidden={!visible} data-visible={visible}
    className={clsx("file-drop-overlay pointer-events-none absolute inset-0 z-20", "flex flex-col items-center justify-center gap-5 px-6 text-center", "bg-surface/85 backdrop-blur-sm")}>
    <div aria-hidden="true" className={clsx("relative flex h-20 w-40 items-center justify-center")}>
      {tiles.map((tile) => <span key={tile.label}
        className={clsx("file-drop-tile absolute flex size-16 items-center justify-center rounded-xl", "border border-ink/15 bg-surface text-muted", "last:border-transparent last:bg-chain-lime last:text-chain-navy")}>
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={clsx("size-7")}><path d={tile.path} /></svg>
      </span>)}
    </div>
    <div>
      <SectionTitle>Add files</SectionTitle>
      <BodyText tone="muted" className={clsx("mt-1")}>Drop images, PDFs or text files here to add them to your message.</BodyText>
    </div>
  </div>;
}
