import clsx from "clsx";
import { useState } from "react";

import ConfirmDeleteDialog from "../../../shared/ui/ConfirmDeleteDialog";
import CourseIcon from "../../../shared/ui/CourseIcon";
import { BodyText, Caption, PageTitle } from "../../../shared/ui/Typography";
import DeletedItemPreview from "../components/DeletedItemPreview";
import { daysLeft, deletedItemKey, KEEP_DAYS, type DeletedItem } from "../lib/deleted-item/types";

const plural = (count: number, noun: string) => `${count} ${noun}${count === 1 ? "" : "s"}`;

function whereItWas(item: DeletedItem) {
  switch (item.kind) {
    case "course":
      return `Course · ${plural(item.modules, "module")} · ${plural(item.pages, "page")}`;
    case "module":
      return `Module in ${item.course_name} · ${plural(item.pages, "page")}`;
    case "page":
      return `Page in ${item.course_name} › ${item.module_name}`;
  }
}

function timeLeft(item: DeletedItem) {
  const days = daysLeft(item);
  return days === 0 ? "Deleting soon" : `${plural(days, "day")} left`;
}

export default function RecentlyDeletedPage({
  items,
  onRestore,
  onErase
}: Readonly<{
  items: DeletedItem[] | null;
  onRestore: (items: DeletedItem[]) => Promise<void>;
  onErase: (items: DeletedItem[]) => Promise<void>;
}>) {
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [erasing, setErasing] = useState<DeletedItem[] | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const chosen = (items ?? []).filter((item) => selected.has(deletedItemKey(item)));
  const allSelected = !!items?.length && chosen.length === items.length;

  function toggle(key: string) {
    const next = new Set(selected);
    if (!next.delete(key)) next.add(key);
    setSelected(next);
  }

  async function restore() {
    setRestoring(true);
    setError("");
    try {
      await onRestore(chosen);
      setNotice(`Restored ${plural(chosen.length, "item")}.`);
      setSelected(new Set());
    } catch {
      setError("Couldn’t restore these items. Try again.");
    } finally {
      setRestoring(false);
    }
  }

  return (
    <div className={clsx("w-full px-4 py-5 sm:px-6")}>
      <PageTitle>Recently deleted</PageTitle>
      <BodyText tone="muted" className={clsx("mt-1")}>
        Deleted courses, modules and pages stay here for {KEEP_DAYS} days. Restore them, or they’re
        deleted permanently after that.
      </BodyText>

      {items?.length === 0 && (
        <BodyText tone="muted" className={clsx("mt-10 text-center")}>
          Nothing here. When you delete a course, module or page, you can get it back from here.
        </BodyText>
      )}

      {items && items.length > 0 && (
        <>
          <div className={clsx("mt-5 flex flex-wrap items-center gap-2")}>
            <label className={clsx("flex items-center gap-2 pr-1 text-sm text-muted")}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() =>
                  setSelected(allSelected ? new Set() : new Set(items.map(deletedItemKey)))
                }
                className={clsx("size-4")}
              />
              <span>Select all</span>
            </label>
            <BodyText tone="muted" className={clsx("text-sm")}>
              {chosen.length} selected
            </BodyText>
            <span className={clsx("flex-1")} />
            <button
              type="button"
              onClick={() => void restore()}
              disabled={chosen.length === 0 || restoring}
              className={clsx(
                "h-9 rounded-md border border-ink/20 bg-surface px-3 text-sm font-medium text-ink",
                "hover:bg-ink/5",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              {restoring ? "Restoring…" : "Restore"}
            </button>
            <button
              type="button"
              onClick={() => setErasing(chosen)}
              disabled={chosen.length === 0 || restoring}
              className={clsx(
                "h-9 rounded-md bg-danger/10 px-3 text-sm font-medium text-danger",
                "hover:bg-danger/15",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              Delete permanently
            </button>
          </div>
          {error && (
            <BodyText role="alert" tone="error" className={clsx("mt-3")}>
              {error}
            </BodyText>
          )}

          <ul className={clsx("mt-4 divide-y divide-ink/10 rounded-lg", "border border-ink/10")}>
            {items.map((item) => {
              const key = deletedItemKey(item);
              const open = key === openKey;
              return (
                <li key={key} className={clsx(open && "bg-ink/2")}>
                  <div className={clsx("flex items-center gap-3 pl-3")}>
                    <input
                      type="checkbox"
                      aria-label={`Select ${item.name}`}
                      checked={selected.has(key)}
                      onChange={() => toggle(key)}
                      className={clsx("size-4 shrink-0")}
                    />
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenKey(open ? null : key)}
                      className={clsx(
                        "flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-3 text-left",
                        "hover:bg-ink/4 focus-visible:bg-ink/4 focus-visible:outline-none"
                      )}
                    >
                      <CourseIcon icon={item.icon} color={item.color} small />
                      <span className={clsx("min-w-0 flex-1")}>
                        <span className={clsx("block truncate text-sm font-medium")}>
                          {item.name}
                        </span>
                        <Caption as="span" tone="muted" className={clsx("block truncate")}>
                          {whereItWas(item)}
                        </Caption>
                      </span>
                      <Caption
                        as="span"
                        tone="muted"
                        className={clsx("shrink-0 text-right tabular-nums")}
                      >
                        {timeLeft(item)}
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
                  </div>
                  {open && (
                    <div className={clsx("border-t border-ink/10 px-3 py-3 sm:pl-10")}>
                      <DeletedItemPreview item={item} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <p aria-live="polite" className={clsx("sr-only")}>
        {notice}
      </p>

      {erasing && (
        <ConfirmDeleteDialog
          title="Delete permanently?"
          message={
            erasing.length === 1
              ? `“${erasing[0].name}” will be deleted with everything in it, including recordings and attachments. This can’t be undone.`
              : `${plural(erasing.length, "item")} will be deleted with everything in them, including recordings and attachments. This can’t be undone.`
          }
          confirmLabel="Delete permanently"
          failure="Couldn’t delete these items. Try again."
          onConfirm={() => onErase(erasing)}
          onClose={() => setErasing(null)}
          onDeleted={() => {
            setNotice(`Deleted ${plural(erasing.length, "item")} permanently.`);
            setSelected(new Set());
            setErasing(null);
          }}
        />
      )}
    </div>
  );
}
