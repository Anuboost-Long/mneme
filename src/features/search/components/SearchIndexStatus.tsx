import { searchModels } from "@/features/extensions/lib/catalog";
import { isReady, useExtensions } from "@/features/extensions/lib/extensionsState";
import { updateSearchIndex, useSearchIndex } from "@/features/search/lib/searchIndex";
import { BodyText, Caption } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect } from "react";

export default function SearchIndexStatus() {
  const { installed } = useExtensions();
  const index = useSearchIndex();
  const activeModel = searchModels.find((model) => isReady(model, installed))?.manifest.id;

  useEffect(() => {
    void updateSearchIndex();
  }, [activeModel]);

  switch (index.status) {
    case "off":
      return null;
    case "indexing":
      return (
        <div className={clsx("mt-3 flex items-center gap-3")}>
          <progress
            value={index.done / Math.max(index.total, 1)}
            aria-label="Indexing your pages"
            className={clsx(
              "h-1.5 min-w-0 flex-1 overflow-hidden rounded-full",
              "[&::-webkit-progress-bar]:bg-ink/10 [&::-webkit-progress-value]:bg-ink/60"
            )}
          />
          <Caption as="span" role="status" tone="muted" className={clsx("tabular-nums")}>
            Indexing your pages: {index.done} of {index.total}
          </Caption>
        </div>
      );
    case "ready":
      return (
        <Caption role="status" tone="muted" className={clsx("mt-3")}>
          {index.pages === 1 ? "1 page" : `${index.pages} pages`} can be found by meaning. New and
          edited pages are added within two minutes.
        </Caption>
      );
    case "error":
      return (
        <div className={clsx("mt-3")}>
          <BodyText role="alert" tone="error">
            {index.message}
          </BodyText>
          <button
            type="button"
            onClick={() => void updateSearchIndex()}
            className={clsx(
              "mt-1 text-sm font-medium underline underline-offset-4",
              "hover:text-muted"
            )}
          >
            Try again
          </button>
        </div>
      );
  }
}
