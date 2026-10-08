"use client";

import { CheckIcon, CopyIcon } from "@phosphor-icons/react";
import { useState } from "react";

export default function CommandLine({ command }: Readonly<{ command: string }>) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-line bg-raised py-3 pr-3 pl-4">
      <code className="min-w-0 flex-1 py-1 font-mono text-sm leading-6 break-all">{command}</code>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={copied ? "Copied" : "Copy command"}
        className="flex size-8 shrink-0 items-center justify-center rounded-md text-muted transition-colors hover:bg-line hover:text-ink"
      >
        {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
      </button>
    </div>
  );
}
