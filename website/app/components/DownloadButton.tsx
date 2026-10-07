import { AppleLogoIcon } from "@phosphor-icons/react/dist/ssr";

import { downloadUrl } from "../lib/site";

export default function DownloadButton({ size = "md" }: Readonly<{ size?: "sm" | "md" }>) {
  return (
    <a
      href={downloadUrl}
      className={[
        "inline-flex shrink-0 items-center gap-2 rounded-lg bg-action font-medium whitespace-nowrap text-on-action",
        "transition-transform duration-200 hover:-translate-y-px active:translate-y-0 active:scale-[0.98]",
        size === "sm" ? "h-9 px-3.5 text-sm" : "h-12 px-5 text-base"
      ].join(" ")}
    >
      <AppleLogoIcon weight="fill" className={size === "sm" ? "size-4" : "size-5"} aria-hidden />
      Download for Mac
    </a>
  );
}
