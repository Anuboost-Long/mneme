import { useEffect, useState } from "react";
import clsx from "clsx";
import { initDb } from "../../../shared/lib/db";
import Select from "../../../shared/ui/Select";
import { TextInput } from "../../../shared/ui/Input";
import { BodyText, Caption } from "../../../shared/ui/Typography";
import { getRetentionDays, setRetentionDays } from "../lib/retention";
import { errorMessage } from "../../../shared/lib/errorMessage";

export default function ChatRetention() {
  const [retention, setRetention] = useState<"never" | "days">("never");
  const [days, setDays] = useState("30");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    setError("");
    initDb().then(getRetentionDays).then((savedDays) => {
      if (!active) return;
      setRetention(savedDays === null ? "never" : "days");
      setDays(String(savedDays ?? 30));
      setLoaded(true);
    }).catch(() => { if (active) setError("Couldn’t load chat retention. Try again."); });
    return () => { active = false; };
  }, [attempt]);

  async function saveRetention() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await setRetentionDays(retention === "never" ? null : Number(days));
      setNotice("Retention saved. Cleanup runs the next time you open Mneme.");
    } catch (error) {
      setError(errorMessage(error, "Couldn’t save retention. Try again."));
    } finally { setBusy(false); }
  }

  return <div className={clsx("mt-6 space-y-4")}>
      <form onSubmit={(event) => { event.preventDefault(); void saveRetention(); }} className={clsx("space-y-4 border-t border-ink/10 pt-5")}>
        <Select label="Delete conversations after" value={retention} onChange={(value) => { setRetention(value); setNotice(""); }} options={[{ value: "never", label: "Never" }, { value: "days", label: "Number of days" }]} disabled={!loaded || busy} />
        {retention === "days" && <TextInput label="Days without activity" required type="number" min={1} step={1} value={days} disabled={!loaded || busy} onChange={(event) => { setDays(event.target.value); setNotice(""); }} />}
        <Caption tone="muted">Cleanup permanently deletes conversations and their messages after this many days without activity. Usage totals remain until you delete the connection.</Caption>
        <button type="submit" disabled={!loaded || busy} className={clsx("rounded-md border border-ink/15 px-3 py-2 text-sm", "hover:bg-ink/5 disabled:opacity-50")}>Save retention</button>
      </form>
      {notice && <BodyText role="status" tone="muted">{notice}</BodyText>}
      {error && <div><BodyText role="alert" tone="error">{error}</BodyText>{!loaded && <button type="button" onClick={() => setAttempt((value) => value + 1)} className={clsx("mt-2 text-sm underline")}>Try again</button>}</div>}
  </div>;
}
