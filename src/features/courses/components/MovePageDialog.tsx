import clsx from "clsx";
import { useEffect, useState } from "react";

import { errorMessage } from "../../../shared/lib/errorMessage";
import Dialog from "../../../shared/ui/Dialog";
import Select from "../../../shared/ui/Select";
import { BodyText } from "../../../shared/ui/Typography";
import { getModuleDestinations, type ModuleLink } from "../lib/modules";
import type { Page } from "../lib/page/types";
import { movePage } from "../lib/page/actions";

export default function MovePageDialog({ page, onClose, onMoved }: Readonly<{
  page: Page;
  onClose: () => void;
  onMoved: (page: Page) => void;
}>) {
  const [destinations, setDestinations] = useState<ModuleLink[] | null>(null);
  const [target, setTarget] = useState<number>(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getModuleDestinations()
      .then((modules) => {
        const others = modules.filter((module) => module.id !== page.module_id);
        setDestinations(others);
        setTarget(others[0]?.id ?? 0);
      })
      .catch((error_) => setError(errorMessage(error_, "Couldn’t load your modules. Try again.")));
  }, [page.module_id]);

  async function move(complete: (callback: () => void) => void) {
    if (busy || !target) return;
    setBusy(true);
    setError("");
    try {
      const moved = await movePage(page.id, target);
      complete(() => onMoved(moved));
    } catch (error_) {
      setError(errorMessage(error_, "Couldn’t move the page. Try again."));
      setBusy(false);
    }
  }

  return (
    <Dialog title="Move page" busy={busy} onClose={onClose}>
      {(close, complete) => (
        <>
          <BodyText tone="muted" className={clsx("wrap-anywhere")}>
            “{page.title}” moves to the end of the module you choose, with its recordings and highlights.
          </BodyText>
          {destinations?.length === 0 && (
            <BodyText className={clsx("mt-6")}>There’s no other module to move it to yet. Create one first.</BodyText>
          )}
          {destinations && destinations.length > 0 && (
            <div className={clsx("mt-6")}>
              <Select
                label="Move to"
                value={target}
                onChange={setTarget}
                options={destinations.map((module) => ({ value: module.id, label: `${module.course_name} › ${module.name}` }))}
              />
            </div>
          )}
          {error && <BodyText role="alert" tone="error" className={clsx("mt-4")}>{error}</BodyText>}
          <div className={clsx("mt-8 flex justify-end gap-3")}>
            <button type="button" disabled={busy} onClick={close} className={clsx("rounded-md border border-ink/15 px-4 py-2 text-sm", "hover:bg-ink/5")}>Cancel</button>
            <button type="button" disabled={busy || !target} onClick={() => void move(complete)} className={clsx("rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action", "hover:bg-action/85")}>
              {busy ? "Moving…" : "Move page"}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
