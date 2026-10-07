import {
  getSchoolSite,
  putSchoolSite,
  schoolBrowserAvailable,
  signOutOfSchoolSite
} from "@/features/courses/lib/school-browser";
import { errorMessage } from "@/shared/lib/errorMessage";
import { TextInput } from "@/shared/ui/Input";
import { BodyText, Caption, SectionTitle } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect, useState, type SubmitEvent } from "react";

export default function SchoolSiteSettings() {
  const [available, setAvailable] = useState(false);
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState<"idle" | "saved" | "signed-out">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    void schoolBrowserAvailable().then(setAvailable);
    void getSchoolSite()
      .then((saved) => setAddress(saved ?? ""))
      .catch(() => undefined);
  }, []);

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("idle");
    try {
      const url = new URL(address.trim());
      if (!/^https?:$/.test(url.protocol)) throw new Error("Not a web address");
      await putSchoolSite(url.href);
      setStatus("saved");
    } catch {
      setError("Enter the address starting with https://, for example https://canvas.school.edu.");
    }
  }

  async function signOut() {
    setError("");
    setStatus("idle");
    try {
      await signOutOfSchoolSite();
      setStatus("signed-out");
    } catch (error_) {
      setError(errorMessage(error_, "Couldn’t sign out. Try again."));
    }
  }

  if (!available) return null;

  return (
    <section
      aria-labelledby="school-site-title"
      className={clsx("grid gap-6 border-t border-ink/10 py-6 @min-3xl:grid-cols-3")}
    >
      <div>
        <SectionTitle id="school-site-title">School site</SectionTitle>
        <BodyText tone="muted" className={clsx("mt-2 max-w-xs")}>
          Where the school window opens when you import pages that need a login. mneme keeps the
          address only; your login stays in the school window.
        </BodyText>
      </div>
      <div className={clsx("min-w-0 w-full max-w-xl @min-3xl:col-span-2")}>
        <form onSubmit={save} className={clsx("flex flex-wrap items-end gap-3")}>
          <TextInput
            label="Address"
            type="url"
            name="schoolSite"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="https://canvas.school.edu"
            fieldClassName={clsx("min-w-0 flex-1 basis-64")}
          />
          <button
            type="submit"
            className={clsx(
              "h-11 rounded-md border border-ink/15 px-4 text-sm font-medium",
              "hover:bg-ink/5"
            )}
          >
            Save address
          </button>
        </form>
        <button
          type="button"
          onClick={() => void signOut()}
          className={clsx(
            "mt-5 text-sm font-medium underline underline-offset-4",
            "hover:text-muted"
          )}
        >
          Sign out of the school site
        </button>
        {status === "saved" && (
          <Caption role="status" tone="muted" className={clsx("mt-3")}>
            Address saved.
          </Caption>
        )}
        {status === "signed-out" && (
          <Caption role="status" tone="muted" className={clsx("mt-3")}>
            Signed out. The school window will ask you to sign in again.
          </Caption>
        )}
        {error && (
          <BodyText role="alert" tone="error" className={clsx("mt-3")}>
            {error}
          </BodyText>
        )}
      </div>
    </section>
  );
}
