import { ActionScope, type ActionInput } from "@/features/ai-actions/lib/action/types";
import { installCatalogPack } from "@/features/ai-actions/lib/pack/actions";
import { packCatalog } from "@/features/ai-actions/lib/pack/catalog";
import { PackArea, packAreaLabels, type CatalogPack } from "@/features/ai-actions/lib/pack/types";
import { useResetOnOpen } from "@/shared/lib/dialogState";
import { errorMessage } from "@/shared/lib/errorMessage";
import Dialog from "@/shared/ui/Dialog";
import Select from "@/shared/ui/Select";
import { BodyText, Caption, Typography } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useId, useState } from "react";

import ActionIcon from "./ActionIcon";

const scopeTags: Partial<Record<ActionScope, string>> = {
  [ActionScope.Module]: "Module",
  [ActionScope.Course]: "Course"
};

const areaOptions = [
  { value: 0, label: "All subjects" },
  ...Object.values(PackArea)
    .filter((area) => typeof area === "number")
    .map((area) => ({ value: area, label: packAreaLabels[area] }))
];

export function PackActionList({ actions }: Readonly<{ actions: ActionInput[] }>) {
  return (
    <ul className={clsx("m-0 grid list-none gap-1 p-0")}>
      {actions.map((action) => (
        <li key={action.name} className={clsx("flex items-center gap-2 text-sm")}>
          <ActionIcon icon={action.icon} />
          <span className={clsx("min-w-0 flex-1 truncate")}>{action.name}</span>
          {scopeTags[action.scope] && (
            <Caption as="span" tone="muted">
              {scopeTags[action.scope]}
            </Caption>
          )}
        </li>
      ))}
    </ul>
  );
}

function matches(pack: CatalogPack, area: number, search: string) {
  if (area && pack.area !== area) return false;
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return [pack.name, pack.description, ...pack.actions.map((action) => action.name)].some((text) =>
    text.toLowerCase().includes(query)
  );
}

export default function PackBrowser({
  open,
  installedKeys,
  onInstalled,
  onClose
}: Readonly<{
  open: boolean;
  installedKeys: ReadonlySet<string>;
  onInstalled: () => void;
  onClose: () => void;
}>) {
  const searchId = useId();
  const [area, setArea] = useState(0);
  const [search, setSearch] = useState("");
  const [installing, setInstalling] = useState<string | null>(null);
  const [error, setError] = useState("");
  useResetOnOpen(open, () => {
    setArea(0);
    setSearch("");
    setError("");
  });
  const packs = packCatalog.filter((pack) => matches(pack, area, search));

  async function install(pack: CatalogPack) {
    setInstalling(pack.key);
    setError("");
    try {
      await installCatalogPack(pack);
      onInstalled();
    } catch (error) {
      setError(errorMessage(error, `Couldn’t install “${pack.name}”. Try again.`));
    } finally {
      setInstalling(null);
    }
  }

  return (
    <Dialog open={open} title="Browse packs" wide busy={installing !== null} onClose={onClose}>
      {(close) => (
        <>
          <BodyText tone="muted">
            Each pack adds a set of actions for a subject to the AI actions menu. You can edit, turn
            off or remove them later.
          </BodyText>
          <div className={clsx("mt-5 grid gap-3 sm:grid-cols-2")}>
            <Select label="Subject" value={area} onChange={setArea} options={areaOptions} />
            <div className={clsx("min-w-0 space-y-2")}>
              <label htmlFor={searchId} className={clsx("block")}>
                <Typography as="span" variant="label">
                  Search
                </Typography>
              </label>
              <input
                id={searchId}
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pack or action name"
                className={clsx(
                  "block h-11 w-full min-w-0 rounded-md",
                  "border border-ink/20 bg-surface",
                  "px-3 text-sm text-ink placeholder:text-muted",
                  "focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-ink"
                )}
              />
            </div>
          </div>
          {error && (
            <BodyText role="alert" tone="error" className={clsx("mt-4")}>
              {error}
            </BodyText>
          )}
          {packs.length === 0 ? (
            <BodyText tone="muted" className={clsx("mt-6")}>
              No packs match. Try another subject or search.
            </BodyText>
          ) : (
            <ul
              className={clsx(
                "mt-5 max-h-96 list-none divide-y divide-ink/10 overflow-y-auto p-0",
                "rounded-lg border border-ink/10"
              )}
            >
              {packs.map((pack) => (
                <li key={pack.key} className={clsx("flex items-start gap-3 px-4 py-3")}>
                  <span className={clsx("mt-0.5 text-muted")}>
                    <ActionIcon icon={pack.icon} />
                  </span>
                  <div className={clsx("min-w-0 flex-1")}>
                    <BodyText className={clsx("font-medium")}>{pack.name}</BodyText>
                    <Caption tone="muted">
                      {packAreaLabels[pack.area]} · {pack.description}
                    </Caption>
                    <details className={clsx("mt-1")}>
                      <summary className={clsx("cursor-pointer text-xs text-muted hover:text-ink")}>
                        {pack.actions.length} actions
                      </summary>
                      <div className={clsx("mt-2")}>
                        <PackActionList actions={pack.actions} />
                      </div>
                    </details>
                  </div>
                  {installedKeys.has(pack.key) ? (
                    <Caption as="span" tone="muted" className={clsx("shrink-0 py-1.5")}>
                      Installed
                    </Caption>
                  ) : (
                    <button
                      type="button"
                      disabled={installing !== null}
                      onClick={() => void install(pack)}
                      className={clsx(
                        "shrink-0 rounded-md border border-ink/15 px-3 py-1.5 text-sm font-medium",
                        "hover:bg-ink/5 disabled:opacity-50"
                      )}
                    >
                      {installing === pack.key ? "Installing…" : "Install"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className={clsx("mt-6 flex justify-end")}>
            <button
              type="button"
              disabled={installing !== null}
              onClick={close}
              className={clsx(
                "rounded-md border border-ink/15 px-4 py-2 text-sm",
                "hover:bg-ink/5"
              )}
            >
              Done
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
