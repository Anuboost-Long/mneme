"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export default function WorkspaceScreenshot() {
  const preview = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const element = preview.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.3 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <figure
      ref={preview}
      data-visible={visible}
      className="product-shot w-full overflow-hidden border border-ink/15 bg-ink shadow-product"
    >
      <Image
        src="/screenshots/mneme-workspace.png"
        alt="Mneme displaying a course page about disaster recovery"
        width={3018}
        height={1884}
        className="block h-auto w-full"
        sizes="(min-width: 1280px) 72rem, 100vw"
      />
      <figcaption className="border-t border-paper/10 px-4 py-3 text-sm text-paper/65">
        Mneme in use: a course page with its structure, source context, and reading content in one desktop workspace.
      </figcaption>
    </figure>
  );
}
