import type { Metadata } from "next";

import CommandLine from "../components/CommandLine";
import Reveal from "../components/Reveal";
import SiteShell from "../components/SiteShell";
import { diskImageUrl, installCommand, releasesUrl, unquarantineCommand } from "../lib/site";

export const metadata: Metadata = { title: "Download", description: "Install mneme on your Mac." };

export default function DownloadPage() {
  return (
    <SiteShell>
      <section className="border-b border-line">
        <div className="mx-auto max-w-3xl px-4 pt-16 pb-14 sm:px-6 lg:pt-24">
          <Reveal>
            <h1 className="text-4xl leading-[1.05] font-semibold tracking-tight text-balance md:text-6xl">
              Install mneme
            </h1>
            <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-muted">
              For Mac computers with macOS 12 or later, Apple Silicon or Intel.
            </p>
          </Reveal>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal className="border-b border-line py-14">
          <h2 className="text-2xl font-semibold tracking-tight">Install with one line</h2>
          <p className="mt-3 max-w-[56ch] leading-relaxed text-muted">
            Open Terminal, paste this line and press Return. It picks the right build for your Mac,
            installs it to Applications and lets macOS open it. Run it again to update.
          </p>
          <div className="mt-6">
            <CommandLine command={installCommand} />
          </div>
        </Reveal>

        <Reveal className="border-b border-line py-14">
          <h2 className="text-2xl font-semibold tracking-tight">Or use the disk image</h2>
          <ol className="mt-5 list-decimal space-y-4 pl-5 leading-relaxed text-muted marker:text-ink">
            <li>
              Download{" "}
              <a href={diskImageUrl("arm64")} className="font-medium text-ink underline underline-offset-4">
                mneme for Apple Silicon
              </a>{" "}
              (M1 and later) or{" "}
              <a href={diskImageUrl("x64")} className="font-medium text-ink underline underline-offset-4">
                mneme for Intel
              </a>.
            </li>
            <li>Open it and drag mneme onto Applications.</li>
            <li>
              In Terminal, run this line before you open mneme the first time:
              <div className="mt-3">
                <CommandLine command={unquarantineCommand} />
              </div>
            </li>
          </ol>
        </Reveal>

        <Reveal className="py-14">
          <h2 className="text-2xl font-semibold tracking-tight">Why the extra step?</h2>
          <p className="mt-3 max-w-[56ch] leading-relaxed text-muted">
            mneme isn’t signed with an Apple Developer ID yet, so macOS calls a downloaded copy
            “damaged”. Your download is fine. The line above clears the flag macOS adds to
            downloads, and the installer does it for you. Every version is listed on{" "}
            <a href={releasesUrl} className="font-medium text-ink underline underline-offset-4">
              the releases page
            </a>.
          </p>
        </Reveal>
      </div>
    </SiteShell>
  );
}
