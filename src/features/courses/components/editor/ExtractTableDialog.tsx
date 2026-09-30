import type { RecognizedDocument } from "@chain/sdk";
import clsx from "clsx";
import { useEffect, useState } from "react";

import { extractTables } from "../../../../shared/lib/ocr";
import Dialog from "../../../../shared/ui/Dialog";
import { BodyText, Caption } from "../../../../shared/ui/Typography";
import { tableHtml } from "../../lib/recognized-document";
import type { ExtractPlacement } from "./ExtractTextDialog";

type Table = RecognizedDocument["tables"][number];

export default function ExtractTableDialog({
  imageSrc,
  onInsert,
  onClose
}: Readonly<{
  imageSrc: string;
  onInsert: (html: string, placement: ExtractPlacement) => void;
  onClose: () => void;
}>) {
  const [tables, setTables] = useState<Table[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    extractTables(imageSrc)
      .then((found) => active && setTables(found))
      .catch((error_: Error) => active && setError(error_.message));
    return () => {
      active = false;
    };
  }, [imageSrc]);

  const found = tables !== null && tables.length > 0;

  return (
    <Dialog title="Extract table" onClose={onClose}>
      {(close, complete) => (
        <>
          {tables === null && !error && (
            <BodyText role="status" tone="muted">
              Looking for tables in the image…
            </BodyText>
          )}
          {error && (
            <BodyText role="alert" tone="error">
              {error}
            </BodyText>
          )}
          {tables?.length === 0 && <BodyText tone="muted">No table found in this image.</BodyText>}
          {found && (
            <>
              <Caption tone="muted">Check the cells before inserting.</Caption>
              <div className={clsx("mt-3 max-h-80 space-y-4 overflow-auto")}>
                {tables.map((table) => (
                  <TablePreview key={JSON.stringify(table.box)} table={table} />
                ))}
              </div>
            </>
          )}
          <div className={clsx("mt-8 flex flex-wrap justify-end gap-3")}>
            <button
              type="button"
              onClick={close}
              className={clsx("rounded-md border border-ink/15 px-4 py-2 text-sm", "hover:bg-ink/5")}
            >
              {found ? "Cancel" : "Close"}
            </button>
            {found && (
              <>
                <button
                  type="button"
                  onClick={() => complete(() => onInsert(tables.map(tableHtml).join(""), "replace"))}
                  className={clsx(
                    "rounded-md border border-ink/15 px-4 py-2 text-sm font-medium",
                    "hover:bg-ink/5"
                  )}
                >
                  Replace image
                </button>
                <button
                  type="button"
                  onClick={() => complete(() => onInsert(tables.map(tableHtml).join(""), "below"))}
                  className={clsx(
                    "rounded-md bg-action px-4 py-2 text-sm font-medium text-on-action",
                    "hover:bg-action/85"
                  )}
                >
                  Insert below image
                </button>
              </>
            )}
          </div>
        </>
      )}
    </Dialog>
  );
}

function TablePreview({ table }: Readonly<{ table: Table }>) {
  return (
    <table className={clsx("w-full border-collapse text-sm")}>
      <tbody>
        {table.rows.map((cells, row) => (
          <tr key={JSON.stringify(cells[0]?.box ?? row)}>
            {cells.map((cell) => {
              const Cell = row === 0 ? "th" : "td";
              return (
                <Cell
                  key={JSON.stringify(cell.box)}
                  rowSpan={cell.rowSpan}
                  colSpan={cell.colSpan}
                  className={clsx(
                    "border border-ink/15 px-2 py-1 text-left align-top",
                    row === 0 && "bg-ink/5 font-medium"
                  )}
                >
                  {cell.text}
                </Cell>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
