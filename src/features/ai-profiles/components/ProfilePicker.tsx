import clsx from "clsx";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { errorMessage } from "../../../shared/lib/errorMessage";
import Select from "../../../shared/ui/Select";
import { BodyText, Caption } from "../../../shared/ui/Typography";
import {
  getDefaultProfileId,
  getProfiles,
  setDefaultProfileId,
  type AiProfile
} from "../lib/profiles";

const unset = 0;

export type CourseProfile = {
  profileId: number | null;
  onChange: (id: number | null) => Promise<void>;
};

export default function ProfilePicker({
  course,
  compact = false
}: Readonly<{
  course?: CourseProfile;
  compact?: boolean;
}>) {
  const [profiles, setProfiles] = useState<AiProfile[]>([]);
  const [defaultId, setDefaultId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getProfiles(), getDefaultProfileId()])
      .then(([all, id]) => {
        setProfiles(all);
        setDefaultId(id);
      })
      .catch((error) => setError(errorMessage(error, "Couldn’t load your AI profiles.")))
      .finally(() => setLoaded(true));
  }, []);

  async function choose(value: number) {
    const id = value === unset ? null : value;
    setBusy(true);
    setError("");
    try {
      if (course) await course.onChange(id);
      else {
        await setDefaultProfileId(id);
        setDefaultId(id);
      }
    } catch (error) {
      setError(errorMessage(error, "Couldn’t change the profile. Try again."));
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return null;
  if (!profiles.length && !error) {
    return (
      <Caption as="p" tone="muted">
        No AI profile.{" "}
        <Link
          to="/settings/ai#ai-profiles"
          className={clsx("text-ink underline underline-offset-4")}
        >
          Create one
        </Link>{" "}
        to set how the agent answers.
      </Caption>
    );
  }

  const defaultName = profiles.find((profile) => profile.id === defaultId)?.name;
  const unsetLabel = course ? `Default (${defaultName ?? "none"})` : "None";
  const value = (course ? course.profileId : defaultId) ?? unset;

  return (
    <div>
      <Select
        label={course ? "Profile for this course" : "Default AI profile"}
        compact={compact}
        value={value}
        disabled={busy}
        onChange={(next) => void choose(next)}
        options={[
          { value: unset, label: unsetLabel },
          ...profiles.map((profile) => ({ value: profile.id, label: profile.name }))
        ]}
      />
      {error && (
        <BodyText role="alert" tone="error" className={clsx("mt-2")}>
          {error}
        </BodyText>
      )}
    </div>
  );
}
