import { getAttachment } from "@/features/courses/lib/attachment/actions";
import type { Page } from "@/features/courses/lib/page/types";
import { getRecording } from "@/features/courses/lib/recording/actions";
import type { Flashcard } from "@/features/flashcards/lib/card/types";
import { desktop } from "@chain/sdk";

import { escapeHtml, printDocument, todayLabel } from "./printDocument";

export function pageHasContent(content: string | null) {
  if (!content) return false;
  const body = new DOMParser().parseFromString(content, "text/html").body;
  return body.querySelector("img, [data-attachment-id], [data-recording-id], [data-video]") !== null || body.textContent.trim() !== "";
}

async function mediaLine(block: HTMLElement) {
  const line = document.createElement("p");
  line.className = "media";
  if (block.dataset.attachmentId) {
    const attachment = await getAttachment(Number(block.dataset.attachmentId));
    line.textContent = `Attached file: ${attachment?.file_name ?? "missing"}`;
  } else if (block.dataset.recordingId) {
    const recording = await getRecording(Number(block.dataset.recordingId));
    line.textContent = `Recording: ${recording?.name ?? "missing"}`;
  } else if (block.dataset.embed) {
    const link = document.createElement("a");
    link.href = block.dataset.embed;
    link.textContent = block.dataset.embed;
    line.append("Video: ", link);
  } else {
    line.textContent = "Video";
  }
  return line;
}

export async function pagePdfHtml(page: Page, place: string) {
  const body = new DOMParser().parseFromString(page.content ?? "", "text/html").body;
  for (const details of body.querySelectorAll("details")) details.open = true;
  for (const image of body.querySelectorAll<HTMLImageElement>("img[data-caption]")) {
    const caption = document.createElement("figcaption");
    caption.textContent = image.dataset.caption ?? "";
    image.after(caption);
  }
  const media = body.querySelectorAll<HTMLElement>("[data-attachment-id], [data-recording-id], [data-video]");
  await Promise.all([...media].map(async (block) => block.replaceWith(await mediaLine(block))));
  return printDocument({ title: page.title, details: `${place} · ${todayLabel()}`, body: body.innerHTML });
}

export function deckPdfHtml(cards: Flashcard[], title: string, place: string) {
  const items = cards.map(
    (card, index) => `<li class="card">
<span class="card-number">${index + 1}</span>
<div>
<p class="card-front">${escapeHtml(card.front)}</p>
<p class="card-back">${escapeHtml(card.back)}</p>
${card.page_title ? `<p class="card-source">${escapeHtml(card.page_title)}</p>` : ""}
</div>
</li>`
  );
  const count = `${cards.length} ${cards.length === 1 ? "card" : "cards"}`;
  return printDocument({
    title,
    details: `${place} · ${count} · ${todayLabel()}`,
    body: `<ol class="cards">${items.join("")}</ol>`
  });
}

export async function sharePdf(html: string, name: string, anchor: DOMRect) {
  const pdf = await desktop.pdf.render(html, {
    title: name,
    footer: { left: "Made with mneme", right: "Page {page} of {pages}" }
  });
  try {
    if ((await desktop.share.availability()).available) {
      const { x, y, width, height } = anchor;
      await desktop.share.show([{ reference: pdf.reference, name }], { anchor: { x, y, width, height }, title: name });
    } else {
      await desktop.files.save(await desktop.files.read(pdf.reference), {
        suggestedName: `${name.replace(/[\\/:*?"<>|]/g, "-")}.pdf`,
        extensions: ["pdf"]
      });
    }
  } finally {
    await desktop.files.delete(pdf.reference).catch(() => undefined);
  }
}

export function sharePdfError(error: unknown) {
  switch ((error as { code?: string } | null)?.code) {
    case "NOT_FOUND":
      return "An image couldn’t be loaded, so the PDF wasn’t made. Replace or remove it and try again.";
    case "TIMEOUT":
      return "Images took too long to load, so the PDF wasn’t made. Try again.";
    case "UNAVAILABLE":
      return "A share menu is already open. Close it and try again.";
    case "UNSUPPORTED":
      return "Sharing as PDF isn’t available on this computer.";
    default:
      return "Couldn’t make the PDF. Try again.";
  }
}
