import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

import { errorMessage } from "../../../shared/lib/errorMessage";
import Dialog from "../../../shared/ui/Dialog";
import { rowAction } from "../../../shared/ui/rowAction";
import { BodyText, Caption, SectionTitle } from "../../../shared/ui/Typography";
import { answerLengths, explanationLevels, languages, toggles, tones } from "../lib/preferences";
import {
  deleteProfile,
  getDefaultProfileId,
  getProfiles,
  setDefaultProfileId
} from "../lib/profile/actions";
import type { AiProfile } from "../lib/profile/types";
import ProfileForm from "./ProfileForm";

function summary(profile: AiProfile) {
  const parts = [
    profile.language && languages[profile.language]?.label,
    explanationLevels[profile.explanationLevel]?.label,
    tones[profile.tone]?.label,
    answerLengths[profile.answerLength]?.label,
    profile.keepTerms && toggles.keepTerms.label,
    profile.useExamples && toggles.useExamples.label,
    profile.hintsForAssessed && toggles.hintsForAssessed.label
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : "No preferences set";
}

type DialogState =
  | { kind: "create" }
  | { kind: "edit"; profile: AiProfile }
  | { kind: "delete"; profile: AiProfile }
  | null;

function DeleteProfile({
  profile,
  onClose,
  onDelete
}: Readonly<{ profile: AiProfile; onClose: () => void; onDelete: () => void }>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirmDelete(complete: (callback: () => void) => void) {
    setBusy(true);
    try {
      await deleteProfile(profile.id);
      complete(onDelete);
    } catch {
      setError("Couldn’t delete the profile. Try again.");
      setBusy(false);
    }
  }

  return (
    <Dialog title="Delete profile?" busy={busy} onClose={onClose}>
      {(close, complete) => (
        <>
          <BodyText tone="muted" className={clsx("wrap-anywhere")}>
            Courses using “{profile.name}” will switch to the default profile. Your pages aren’t
            affected.
          </BodyText>
          {error && (
            <BodyText role="alert" tone="error" className={clsx("mt-4")}>
              {error}
            </BodyText>
          )}
          <div className={clsx("mt-8 flex justify-end gap-3")}>
            <button
              type="button"
              disabled={busy}
              onClick={close}
              className={clsx(
                "rounded-md border border-ink/15 px-4 py-2 text-sm",
                "hover:bg-ink/5"
              )}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => confirmDelete(complete)}
              className={clsx(
                "rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white",
                "hover:bg-red-800"
              )}
            >
              {busy ? "Deleting…" : "Delete profile"}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}

export default function ProfileSettings() {
  const section = useRef<HTMLElement>(null);
  const { hash } = useLocation();
  const [profiles, setProfiles] = useState<AiProfile[]>([]);
  const [defaultId, setDefaultId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState<DialogState>(null);

  async function load() {
    try {
      const [all, id] = await Promise.all([getProfiles(), getDefaultProfileId()]);
      setProfiles(all);
      setDefaultId(id);
    } catch (error) {
      setError(errorMessage(error, "Couldn’t load your AI profiles. Try again."));
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (hash === "#ai-profiles" && loaded) section.current?.scrollIntoView({ block: "start" });
  }, [hash, loaded]);

  async function changeDefault(id: number | null) {
    setBusy(true);
    setError("");
    try {
      await setDefaultProfileId(id);
      setDefaultId(id);
    } catch (error) {
      setError(errorMessage(error, "Couldn’t change the default profile. Try again."));
    } finally {
      setBusy(false);
    }
  }

  function saved() {
    setDialog(null);
    void load();
  }

  return (
    <section
      ref={section}
      id="ai-profiles"
      aria-labelledby="ai-profiles-title"
      className={clsx("grid gap-6 border-t border-ink/10 py-6 @min-3xl:grid-cols-3")}
    >
      <div>
        <SectionTitle id="ai-profiles-title">AI profiles</SectionTitle>
        <BodyText tone="muted" className={clsx("mt-2 max-w-xs")}>
          How the agent writes for you, like your language or how much to explain. The default
          applies everywhere; a course can use its own instead, set in its details.
        </BodyText>
      </div>
      <div className={clsx("min-w-0 w-full max-w-xl @min-3xl:col-span-2")}>
        {!loaded && (
          <BodyText role="status" tone="muted">
            Loading profiles…
          </BodyText>
        )}
        {loaded && profiles.length === 0 && (
          <BodyText tone="muted">
            No profiles yet. Create one to tell the agent how you want it to answer.
          </BodyText>
        )}
        <ul className={clsx("m-0 list-none divide-y divide-ink/10 p-0")}>
          {profiles.map((profile) => (
            <li
              key={profile.id}
              className={clsx("flex flex-wrap items-center gap-x-3 gap-y-1 py-3")}
            >
              <span className={clsx("min-w-0 flex-1")}>
                <BodyText as="span" className={clsx("block truncate font-medium")}>
                  {profile.name}
                </BodyText>
                <Caption as="span" tone="muted" className={clsx("block truncate")}>
                  {profile.id === defaultId ? "Default · " : ""}
                  {summary(profile)}
                </Caption>
              </span>
              <span className={clsx("flex shrink-0 items-center gap-1")}>
                {profile.id === defaultId ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => changeDefault(null)}
                    className={rowAction()}
                  >
                    Remove as default
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => changeDefault(profile.id)}
                    className={rowAction()}
                  >
                    Make default
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setDialog({ kind: "edit", profile })}
                  className={rowAction("edit")}
                >
                  Edit
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setDialog({ kind: "delete", profile })}
                  className={rowAction("danger")}
                >
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={busy}
          onClick={() => setDialog({ kind: "create" })}
          className={clsx(
            "mt-4 rounded-md border border-ink/15 px-4 py-2 text-sm font-medium",
            "hover:bg-ink/5"
          )}
        >
          New profile
        </button>
        <div className={clsx("mt-2 min-h-6")}>
          {error && (
            <BodyText role="alert" tone="error">
              {error}
            </BodyText>
          )}
        </div>
      </div>
      {dialog?.kind === "create" && <ProfileForm onClose={() => setDialog(null)} onSave={saved} />}
      {dialog?.kind === "edit" && (
        <ProfileForm profile={dialog.profile} onClose={() => setDialog(null)} onSave={saved} />
      )}
      {dialog?.kind === "delete" && (
        <DeleteProfile profile={dialog.profile} onClose={() => setDialog(null)} onDelete={saved} />
      )}
    </section>
  );
}
