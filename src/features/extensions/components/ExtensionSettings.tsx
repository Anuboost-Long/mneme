import {
  searchModels,
  transcriptionModels,
  VAD,
  voiceModels,
  type Extension
} from "@/features/extensions/lib/catalog";
import {
  cancelExtension,
  installExtension,
  isReady,
  refreshExtensions,
  removeExtension,
  setOnlyDownloaded,
  useExtensions
} from "@/features/extensions/lib/extensionsState";
import SearchIndexStatus from "@/features/search/components/SearchIndexStatus";
import { BodyText, Caption, SectionTitle, Typography } from "@/shared/ui/Typography";
import clsx from "clsx";
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

function formatBytes(bytes: number) {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`;
  return `${Math.max(1, Math.round(bytes / 1e6))} MB`;
}

const button = clsx(
  "h-9 shrink-0 rounded-md border border-ink/15 px-4 text-sm font-medium",
  "hover:bg-ink/5 focus-visible:outline-2 focus-visible:outline-ink"
);

export default function ExtensionSettings() {
  const section = useRef<HTMLElement>(null);
  const { hash } = useLocation();
  const { loaded, unsupported, installed } = useExtensions();

  useEffect(() => {
    void refreshExtensions();
  }, []);

  useEffect(() => {
    if (hash === "#extensions" && loaded) section.current?.scrollIntoView({ block: "start" });
  }, [hash, loaded]);

  const used = Object.values(installed).reduce((total, model) => total + model.sizeBytes, 0);

  return (
    <section
      ref={section}
      id="extensions"
      aria-labelledby="extensions-title"
      className={clsx("grid gap-6 border-t border-ink/10 py-6 @min-3xl:grid-cols-3")}
    >
      <div>
        <SectionTitle id="extensions-title">Extensions</SectionTitle>
        <BodyText tone="muted" className={clsx("mt-2 max-w-xs")}>
          Optional open-source models that run on this device. Download one and Mneme sets it up;
          nothing is sent anywhere.
        </BodyText>
      </div>
      <div className={clsx("min-w-0 w-full max-w-xl @min-3xl:col-span-2")}>
        {used > 0 && (
          <Caption tone="muted">{formatBytes(used)} used by downloaded extensions.</Caption>
        )}
        {!loaded && (
          <BodyText role="status" tone="muted">
            Checking installed extensions…
          </BodyText>
        )}
        {unsupported && (
          <BodyText tone="muted">Extensions aren’t available on this system yet.</BodyText>
        )}
        {loaded && !unsupported && (
          <>
            <Typography as="h3" variant="label" className={clsx("mt-4 first:mt-0")}>
              Voices
            </Typography>
            <BodyText tone="muted" className={clsx("mt-1")}>
              Read pages aloud with a downloaded voice. They appear in Listen’s voice picker next to
              this device’s own voices.
            </BodyText>
            <ExtensionList extensions={voiceModels} />
            <OnlyDownloaded
              extensions={voiceModels}
              label="Only use downloaded voices"
              hint="Listen stops offering this device’s own voices."
            />
            <Typography as="h3" variant="label" className={clsx("mt-6")}>
              Transcription models
            </Typography>
            <BodyText tone="muted" className={clsx("mt-1")}>
              Used by Transcribe on recordings, alongside this Mac’s built-in engine. On Windows
              they’re the only way to transcribe.
            </BodyText>
            <ExtensionList extensions={transcriptionModels} />
            <OnlyDownloaded
              extensions={transcriptionModels}
              label="Only use downloaded models"
              hint="Transcribe stops offering this device’s built-in engine."
            />
            <Typography as="h3" variant="label" className={clsx("mt-6")}>
              Search by meaning
            </Typography>
            <BodyText tone="muted" className={clsx("mt-1")}>
              Finds pages by what they’re about, not just their words, in ⌘P and for the assistant.
              Your pages are indexed on this device. With both downloaded, the first one is used.
            </BodyText>
            <ExtensionList extensions={searchModels} />
            <SearchIndexStatus />
          </>
        )}
        <Caption tone="muted" className={clsx("mt-3")}>
          Voices and transcription models come from the sherpa-onnx releases, search models from
          Hugging Face; each is checked against a pinned checksum before it’s kept. Speech detection
          uses Silero VAD (
          <a
            href={VAD.license.url}
            target="_blank"
            rel="noreferrer"
            className={clsx("underline underline-offset-2 hover:text-ink")}
          >
            {VAD.license.name}
          </a>
          ), downloaded with the first model.
        </Caption>
      </div>
    </section>
  );
}

function ExtensionList({ extensions }: Readonly<{ extensions: Extension[] }>) {
  const { installed, downloads, errors } = useExtensions();
  return (
    <ul className={clsx("mt-3 divide-y divide-ink/10 border-y border-ink/10")}>
      {extensions.map((extension) => {
        const { id } = extension.manifest;
        const download = downloads[id];
        const ready = isReady(extension, installed);
        const size = installed[id]?.sizeBytes ?? extension.manifest.sizeBytes;
        const sizeNote = ready ? "on disk" : "download";
        return (
          <li key={id} className={clsx("py-3")}>
            <div className={clsx("flex flex-wrap items-start justify-between gap-3")}>
              <div className={clsx("min-w-0 flex-1")}>
                <Typography as="span" variant="label">
                  {extension.name}
                </Typography>
                <BodyText tone="muted">{extension.description}</BodyText>
                <Caption tone="muted">
                  {size ? `${formatBytes(size)} ${sizeNote} · ` : ""}
                  <a
                    href={extension.license.url}
                    target="_blank"
                    rel="noreferrer"
                    className={clsx("underline underline-offset-2 hover:text-ink")}
                  >
                    {extension.license.name} license
                  </a>
                </Caption>
              </div>
              {download && (
                <button
                  type="button"
                  onClick={() => void cancelExtension(extension)}
                  className={button}
                >
                  Cancel
                </button>
              )}
              {!download && ready && (
                <button
                  type="button"
                  onClick={() => void removeExtension(extension)}
                  className={clsx(button, "text-muted hover:bg-danger/10 hover:text-danger")}
                >
                  Remove
                </button>
              )}
              {!download && !ready && (
                <button
                  type="button"
                  onClick={() => void installExtension(extension)}
                  className={button}
                >
                  Download
                </button>
              )}
            </div>
            {download && (
              <div className={clsx("mt-2 flex items-center gap-3")}>
                <progress
                  value={download.total ? download.received / download.total : undefined}
                  aria-label={`Downloading ${extension.name}`}
                  className={clsx(
                    "h-1.5 min-w-0 flex-1 overflow-hidden rounded-full",
                    "[&::-webkit-progress-bar]:bg-ink/10 [&::-webkit-progress-value]:bg-ink/60"
                  )}
                />
                <Caption as="span" tone="muted" className={clsx("tabular-nums")}>
                  {download.total
                    ? `${Math.round((download.received / download.total) * 100)}%`
                    : formatBytes(download.received)}
                </Caption>
              </div>
            )}
            {errors[id] && (
              <Caption role="alert" tone="error" className={clsx("mt-2")}>
                {errors[id]}
              </Caption>
            )}
          </li>
        );
      })}
    </ul>
  );
}

// Shown once something in the group is downloaded; the device's own
// option returns by itself if everything in the group is removed.
function OnlyDownloaded({
  extensions,
  label,
  hint
}: Readonly<{ extensions: Extension[]; label: string; hint: string }>) {
  const { installed, onlyDownloaded } = useExtensions();
  if (extensions.length === 0 || !extensions.some((extension) => isReady(extension, installed)))
    return null;
  const { kind } = extensions[0];
  return (
    <label className={clsx("mt-3 flex cursor-pointer items-start gap-3")}>
      <input
        type="checkbox"
        checked={onlyDownloaded[kind]}
        onChange={(event) => setOnlyDownloaded(kind, event.target.checked)}
        className={clsx("mt-0.5 size-4 shrink-0 accent-ink")}
      />
      <span>
        <Typography as="span" variant="label">
          {label}
        </Typography>
        <Caption tone="muted">{hint} It comes back if you remove every download here.</Caption>
      </span>
    </label>
  );
}
