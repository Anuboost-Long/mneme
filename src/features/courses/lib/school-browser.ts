import { desktop, type BrowserPageContent } from "@chain/sdk";

import { imageFile, MAX_DOWNLOAD_BYTES } from "../../../shared/lib/downloadImage";
import { getSetting, putSetting } from "../../../shared/lib/settings/actions";

const SCHOOL_SITE = "school-site";
const IMPORT = "import";
const DONE = "done";

export const getSchoolSite = () => getSetting(SCHOOL_SITE);
export const putSchoolSite = (address: string) => putSetting(SCHOOL_SITE, address);

let availability: Promise<boolean> | undefined;
let knownAvailable: boolean | undefined;

export function schoolBrowserAvailable() {
  availability ??= Promise.resolve()
    .then(() => desktop.browser.availability())
    .then(({ available }) => available)
    .catch(() => false)
    .then((available) => (knownAvailable = available));
  return availability;
}

export const schoolBrowserKnownAvailable = () => knownAvailable ?? false;

function buttons(importEnabled: boolean) {
  return [
    { id: IMPORT, label: "Import this page", enabled: importEnabled },
    { id: DONE, label: "Done" }
  ];
}

export function openSchoolBrowser(url: string) {
  return desktop.browser.open({ url, title: "School site", buttons: buttons(true) });
}

export const enableImport = (enabled: boolean) =>
  desktop.browser.setButtons(buttons(enabled)).catch(() => undefined);

export const closeSchoolBrowser = () => desktop.browser.close().catch(() => undefined);

export const signOutOfSchoolSite = () => desktop.browser.clearSession();

export function watchSchoolBrowser({
  onImport,
  onClose
}: Readonly<{ onImport: () => void; onClose: () => void }>) {
  const stopButtons = desktop.browser.onButton(({ id }) => {
    if (id === IMPORT) onImport();
    if (id === DONE) void closeSchoolBrowser();
  });
  const stopClose = desktop.browser.onClose(onClose);
  return () => {
    stopButtons();
    stopClose();
  };
}

function absoluteUrl(value: string | null, base: string) {
  try {
    return value ? new URL(value, base).href : "";
  } catch {
    return "";
  }
}

function withFrames(page: BrowserPageContent) {
  const document = new DOMParser().parseFromString(page.html, "text/html");
  if (!document.title.trim()) document.title = page.title;
  for (const frame of page.frames) {
    const frameDocument = new DOMParser().parseFromString(frame.html, "text/html");
    for (const element of frameDocument.querySelectorAll("[src], [href]")) {
      for (const name of ["src", "href"]) {
        const resolved = absoluteUrl(element.getAttribute(name), frame.url);
        if (resolved) element.setAttribute(name, resolved);
      }
    }
    const content = document.createElement("div");
    content.innerHTML = frameDocument.body.innerHTML;
    const iframe = Array.from(document.querySelectorAll("iframe")).find(
      (element) => absoluteUrl(element.getAttribute("src"), page.url) === frame.url
    );
    if (iframe) iframe.replaceWith(content);
    else (document.querySelector("main, article, [role='main']") ?? document.body).append(content);
  }
  return document.documentElement.outerHTML;
}

export async function readSchoolPage() {
  const page = await desktop.browser.read();
  return { url: page.url, html: withFrames(page) };
}

export async function downloadSchoolImage(url: string) {
  try {
    const response = await desktop.browser.fetch(url, { maxBytes: MAX_DOWNLOAD_BYTES });
    return imageFile(response.bytes, response.contentType, url);
  } catch {
    return null;
  }
}
