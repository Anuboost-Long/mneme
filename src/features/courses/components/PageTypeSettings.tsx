import {
  countPagesOfType,
  createCustomPageType,
  deleteCustomPageType,
  renameCustomPageType
} from "@/features/courses/lib/page-type/actions";
import {
  loadCustomPageTypes,
  useCustomPageTypes
} from "@/features/courses/lib/page-type/pageTypesState";
import { customTypeValue, type CustomPageType } from "@/features/courses/lib/page-type/types";
import { errorMessage } from "@/shared/lib/errorMessage";
import ConfirmDeleteDialog from "@/shared/ui/ConfirmDeleteDialog";
import { TextInput } from "@/shared/ui/Input";
import { BodyText, Caption, SectionTitle } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useState, type SubmitEvent } from "react";

const button = clsx(
  "h-9 shrink-0 rounded-md border border-ink/15 px-3 text-sm font-medium",
  "hover:bg-ink/5"
);

export default function PageTypeSettings() {
  const custom = useCustomPageTypes();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null);
  const [deleting, setDeleting] = useState<(CustomPageType & { pages: number }) | null>(null);
  const [error, setError] = useState("");

  async function add(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await createCustomPageType(name);
      setName("");
      await loadCustomPageTypes();
    } catch (error_) {
      setError(errorMessage(error_, "Couldn’t add this page type. Try again."));
    }
  }

  async function rename(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;
    setError("");
    try {
      await renameCustomPageType(editing.id, editing.name);
      setEditing(null);
      await loadCustomPageTypes();
    } catch (error_) {
      setError(errorMessage(error_, "Couldn’t rename this page type. Try again."));
    }
  }

  async function askToDelete(type: CustomPageType) {
    setError("");
    setDeleting({
      ...type,
      pages: await countPagesOfType(customTypeValue(type.id)).catch(() => 0)
    });
  }

  return (
    <section
      aria-labelledby="page-types-title"
      className={clsx("grid gap-6 border-t border-ink/10 py-6 @min-3xl:grid-cols-3")}
    >
      <div>
        <SectionTitle id="page-types-title">Page types</SectionTitle>
        <BodyText tone="muted" className={clsx("mt-2 max-w-xs")}>
          Your own kinds of page, like Lab report or Case study. They’re listed in every Type picker
          after Lesson, Lecture and the others.
        </BodyText>
      </div>
      <div className={clsx("min-w-0 w-full max-w-xl @min-3xl:col-span-2")}>
        {custom.length > 0 && (
          <ul className={clsx("mb-4 divide-y divide-ink/10 rounded-md border border-ink/15")}>
            {custom.map((type) => (
              <li key={type.id} className={clsx("px-4 py-2.5")}>
                {editing?.id === type.id ? (
                  <form onSubmit={rename} className={clsx("flex flex-wrap items-end gap-2")}>
                    <TextInput
                      label={`Rename “${type.name}”`}
                      required
                      autoFocus
                      value={editing.name}
                      onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                      fieldClassName={clsx("min-w-0 flex-1 basis-48")}
                    />
                    <button type="submit" className={button}>
                      Save
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className={button}>
                      Cancel
                    </button>
                  </form>
                ) : (
                  <div className={clsx("flex items-center gap-3")}>
                    <span className={clsx("min-w-0 flex-1 truncate text-sm")}>{type.name}</span>
                    <button
                      type="button"
                      onClick={() => setEditing({ id: type.id, name: type.name })}
                      className={button}
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => void askToDelete(type)}
                      className={clsx(button, "text-muted hover:bg-danger/10 hover:text-danger")}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={add} className={clsx("flex flex-wrap items-end gap-3")}>
          <TextInput
            label="New page type"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Lab report"
            fieldClassName={clsx("min-w-0 flex-1 basis-56")}
          />
          <button type="submit" className={clsx(button, "h-11 px-4")}>
            Add page type
          </button>
        </form>
        {custom.length === 0 && (
          <Caption tone="muted" className={clsx("mt-3")}>
            No page types of your own yet.
          </Caption>
        )}
        {error && (
          <BodyText role="alert" tone="error" className={clsx("mt-3")}>
            {error}
          </BodyText>
        )}
      </div>
      <ConfirmDeleteDialog
        open={deleting !== null}
        title={`Delete “${deleting?.name ?? ""}”?`}
        message={
          deleting?.pages
            ? `${deleting.pages === 1 ? "1 page uses" : `${deleting.pages} pages use`} this type. ${deleting.pages === 1 ? "It becomes" : "They become"} Custom; nothing else about ${deleting.pages === 1 ? "it" : "them"} changes.`
            : "No pages use this type."
        }
        confirmLabel="Delete page type"
        failure="Couldn’t delete this page type. Try again."
        onConfirm={async () => {
          if (deleting) await deleteCustomPageType(deleting.id);
        }}
        onClose={() => setDeleting(null)}
        onDeleted={() => {
          setDeleting(null);
          void loadCustomPageTypes();
        }}
      />
    </section>
  );
}
