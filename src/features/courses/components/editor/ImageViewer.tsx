import clsx from "clsx";
import { useEffect, useLayoutEffect, useRef } from "react";

const OPEN_MS = 300;
const CLOSE_MS = 220;
const EASE = "cubic-bezier(0.2, 0, 0, 1)";

function zoomFrom(origin: HTMLElement, image: HTMLImageElement): Keyframe {
  const from = origin.getBoundingClientRect();
  const box = image.getBoundingClientRect();
  const shownWidth = image.naturalWidth * Math.min(box.width / image.naturalWidth, box.height / image.naturalHeight);
  const dx = from.left + from.width / 2 - (box.left + box.width / 2);
  const dy = from.top + from.height / 2 - (box.top + box.height / 2);
  return { opacity: 1, transform: `translate(${dx}px, ${dy}px) scale(${from.width / shownWidth})` };
}

function fade(elements: (Element | null)[], keyframes: Keyframe[], options: KeyframeAnimationOptions) {
  for (const element of elements) element?.animate(keyframes, options);
}

export default function ImageViewer({
  src,
  alt,
  caption,
  origin,
  onClose
}: Readonly<{ src: string; alt: string; caption: string; origin: HTMLElement | null; onClose: () => void }>) {
  const dialog = useRef<HTMLDialogElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const captionText = useRef<HTMLParagraphElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const close = useRef(onClose);
  const closing = useRef(false);

  useEffect(() => {
    close.current = onClose;
  });

  useLayoutEffect(() => {
    const element = dialog.current;
    const picture = image.current;
    if (!element || !picture) return;
    element.showModal();
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const onPage = (): Keyframe =>
      origin?.isConnected && picture.naturalWidth > 0 ? zoomFrom(origin, picture) : { opacity: 0, transform: "scale(0.96)" };
    let active = true;

    if (!still) {
      picture.style.opacity = "0";
      fade([backdrop.current], [{ opacity: 0 }, { opacity: 1 }], { duration: OPEN_MS, easing: "ease-out" });
      fade([captionText.current, closeButton.current], [{ opacity: 0 }, { opacity: 1 }], {
        duration: OPEN_MS,
        delay: OPEN_MS / 2,
        easing: "ease-out",
        fill: "backwards"
      });
      void picture
        .decode()
        .catch(() => undefined)
        .then(() => {
          if (!active) return;
          picture.style.opacity = "";
          picture.animate([onPage(), { opacity: 1, transform: "none" }], { duration: OPEN_MS, easing: EASE });
        });
    }

    const dismiss = async () => {
      if (closing.current) return;
      closing.current = true;
      if (still) {
        close.current();
        return;
      }
      const options = { duration: CLOSE_MS, easing: EASE, fill: "forwards" } as const;
      fade([backdrop.current], [{ opacity: 1 }, { opacity: 0 }], options);
      fade([captionText.current, closeButton.current], [{ opacity: 1 }, { opacity: 0 }], { ...options, duration: CLOSE_MS / 2 });
      await picture.animate([{ opacity: 1, transform: "none" }, onPage()], options).finished.catch(() => undefined);
      close.current();
    };

    function closeOutsideImage(event: MouseEvent) {
      if (!(event.target instanceof HTMLImageElement)) void dismiss();
    }
    function closeOnEscape(event: Event) {
      event.preventDefault();
      void dismiss();
    }
    element.addEventListener("click", closeOutsideImage);
    element.addEventListener("cancel", closeOnEscape);
    return () => {
      active = false;
      element.removeEventListener("click", closeOutsideImage);
      element.removeEventListener("cancel", closeOnEscape);
      element.close();
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-label={caption || alt || "Image"}
      className={clsx("fixed inset-0 m-0 size-full max-h-none max-w-none overflow-hidden", "bg-transparent backdrop:bg-transparent", "p-6")}
    >
      <div ref={backdrop} aria-hidden="true" className={clsx("fixed inset-0", "bg-black/85")} />
      <div className={clsx("relative flex size-full flex-col items-center justify-center gap-3")}>
        <img ref={image} src={src} alt={alt} className={clsx("min-h-0 max-w-full flex-1 rounded-md object-contain")} />
        {caption && (
          <p ref={captionText} className={clsx("max-w-prose text-center text-sm text-white/85")}>
            {caption}
          </p>
        )}
      </div>
      <button
        ref={closeButton}
        type="button"
        aria-label="Close full size image"
        className={clsx(
          "fixed top-4 right-4 flex size-9 items-center justify-center rounded-md",
          "bg-black/50 text-white",
          "hover:bg-black/70 focus-visible:outline-2 focus-visible:outline-white"
        )}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
    </dialog>
  );
}
