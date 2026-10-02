import clsx from "clsx";
import { useEffect, useState, type SubmitEvent } from "react";

import { errorMessage } from "../../../shared/lib/errorMessage";
import Dialog from "../../../shared/ui/Dialog";
import { TextInput } from "../../../shared/ui/Input";
import { BodyText, Caption } from "../../../shared/ui/Typography";
import { deleteLayout, getLayouts, saveLayout } from "../lib/layout/actions";
import type { SavedLayout } from "../lib/layout/types";
import type { NewWidget } from "../lib/widget/types";
import { layoutPresets } from "../widgets/catalog";

const rowButton = clsx(
  "h-8 rounded-md",
  "border border-ink/20 bg-surface",
  "px-3 text-sm",
  "hover:bg-ink/5 focus-visible:outline-1 focus-visible:outline-ink"
);

const quietButton = clsx(
  "h-8 rounded-md px-2.5 text-sm text-muted",
  "hover:bg-ink/5 hover:text-ink focus-visible:outline-1 focus-visible:outline-ink"
);

function LayoutRow({
  name,
  count,
  onApply,
  onDelete
}: Readonly<{ name: string; count: number; onApply: () => void; onDelete?: () => void }>) {
  return (
    <li className={clsx("flex items-center gap-3", "py-2.5")}>
      <div className={clsx("min-w-0 flex-1")}>
        <p className={clsx("truncate text-sm font-medium")}>{name}</p>
        <Caption tone="muted">{count === 1 ? "1 widget" : `${count} widgets`}</Caption>
      </div>
      {onDelete && (
        <button type="button" aria-label={`Delete the ${name} layout`} onClick={onDelete} className={quietButton}>
          Delete
        </button>
      )}
      <button type="button" aria-label={`Apply the ${name} layout`} onClick={onApply} className={rowButton}>
        Apply
      </button>
    </li>
  );
}

export default function LayoutsDialog({
  current,
  onApply,
  onClose
}: Readonly<{
  current: NewWidget[];
  onApply: (name: string, widgets: NewWidget[]) => void;
  onClose: () => void;
}>) {
  const [layouts, setLayouts] = useState<SavedLayout[] | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  useEffect(() => {
    let active = true;
    getLayouts()
      .then((loaded) => active && setLayouts(loaded))
      .catch(() => active && setError("Couldn’t load your layouts. Close this and try again."));
    return () => {
      active = false;
    };
  }, []);

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved("");
    try {
      const layout = await saveLayout(name, current);
      setLayouts((list) => [...(list ?? []), layout].sort((left, right) => left.name.localeCompare(right.name)));
      setSaved(`Saved “${layout.name}”.`);
      setName("");
    } catch (error_) {
      setError(errorMessage(error_, "Couldn’t save the layout. Try again."));
    } finally {
      setSaving(false);
    }
  }

  async function remove(layout: SavedLayout) {
    setError("");
    setSaved("");
    try {
      await deleteLayout(layout.id);
      setLayouts((list) => list?.filter((item) => item.id !== layout.id) ?? null);
    } catch (error_) {
      setError(errorMessage(error_, "Couldn’t delete the layout. Try again."));
    }
  }

  return (
    <Dialog title="Layouts" onClose={onClose} busy={saving}>
      {(_close, complete) => {
        const apply = (layoutName: string, widgets: NewWidget[]) => {
          onApply(layoutName, widgets);
          complete(onClose);
        };
        return (
          <div className={clsx("space-y-6")}>
            <form onSubmit={(event) => void save(event)} className={clsx("flex items-end gap-2")}>
              <TextInput
                label="Save this Home as a layout"
                placeholder="Exam week"
                value={name}
                maxLength={60}
                onChange={(event) => {
                  setName(event.target.value);
                  setSaved("");
                }}
                fieldClassName={clsx("min-w-0 flex-1")}
              />
              <button type="submit" disabled={saving || !name.trim()} className={clsx(rowButton, "disabled:opacity-50")}>
                Save
              </button>
            </form>
            {saved && <output className={clsx("block text-sm text-muted")}>{saved}</output>}
            {error && (
              <BodyText role="alert" tone="error">
                {error}
              </BodyText>
            )}

            <section aria-labelledby="saved-layouts">
              <h3 id="saved-layouts" className={clsx("text-xs font-medium text-muted")}>
                Your layouts
              </h3>
              {layouts?.length === 0 ? (
                <BodyText tone="muted" className={clsx("mt-2")}>
                  Arrange Home the way you like, then save it above to come back to it anytime.
                </BodyText>
              ) : (
                <ul className={clsx("mt-1 divide-y divide-ink/10")}>
                  {(layouts ?? []).map((layout) => (
                    <LayoutRow
                      key={layout.id}
                      name={layout.name}
                      count={layout.widgets.length}
                      onApply={() => apply(layout.name, layout.widgets)}
                      onDelete={() => void remove(layout)}
                    />
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="designed-layouts">
              <h3 id="designed-layouts" className={clsx("text-xs font-medium text-muted")}>
                Designed layouts
              </h3>
              <ul className={clsx("mt-1 divide-y divide-ink/10")}>
                {layoutPresets.map((preset) => (
                  <LayoutRow
                    key={preset.name}
                    name={preset.name}
                    count={preset.widgets.length}
                    onApply={() => apply(preset.name, preset.widgets)}
                  />
                ))}
              </ul>
            </section>
          </div>
        );
      }}
    </Dialog>
  );
}
