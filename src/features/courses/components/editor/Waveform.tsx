import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

import { WAVEFORM_LENGTH } from "../../lib/useAudioRecorder";

// Newest sample at the right edge, mirrored around the tape's centre
// line, with the envelope drawn as a curve through the midpoints between
// samples so it reads as a voice rather than a bar chart.
export default function Waveform({ values, live }: Readonly<{ values: number[]; live: boolean }>) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context || !size.width) return;
    const scale = window.devicePixelRatio;
    element.width = size.width * scale;
    element.height = size.height * scale;
    context.scale(scale, scale);

    const middle = size.height / 2;
    const step = size.width / (WAVEFORM_LENGTH - 1);
    const offset = WAVEFORM_LENGTH - values.length;
    const points = values.map((value, index) => ({
      x: (offset + index) * step,
      y: Math.max(0.75, value * (middle - 1))
    }));

    const color = getComputedStyle(element).color;
    context.fillStyle = color;
    context.globalAlpha = 0.35;
    context.fillRect(0, middle - 0.5, size.width, 1);
    if (points.length < 2) return;

    const fade = context.createLinearGradient(0, 0, size.width, 0);
    fade.addColorStop(0, "transparent");
    fade.addColorStop(0.25, color);
    context.fillStyle = fade;
    context.globalAlpha = 1;
    context.beginPath();
    context.moveTo(points[0].x, middle - points[0].y);
    for (let index = 1; index < points.length; index++) {
      const previous = points[index - 1];
      const point = points[index];
      context.quadraticCurveTo(previous.x, middle - previous.y, (previous.x + point.x) / 2, middle - (previous.y + point.y) / 2);
    }
    const last = points[points.length - 1];
    context.lineTo(last.x, middle - last.y);
    context.lineTo(last.x, middle + last.y);
    for (let index = points.length - 1; index > 0; index--) {
      const previous = points[index];
      const point = points[index - 1];
      context.quadraticCurveTo(previous.x, middle + previous.y, (previous.x + point.x) / 2, middle + (previous.y + point.y) / 2);
    }
    context.lineTo(points[0].x, middle + points[0].y);
    context.closePath();
    context.fill();
  }, [values, size, live]);

  return (
    <canvas
      ref={canvas}
      className={clsx("h-9 min-w-0 flex-1", live ? "text-chain-lime" : "text-chain-cream/50")}
    />
  );
}
