"use client";

import { useState } from "react";

import ProductShowcase, { type PreviewFeature } from "./ProductShowcase";

const features: ReadonlyArray<Readonly<{ name: PreviewFeature; title: string; description: string }>> = [
  { name: "Read aloud", title: "Listen without leaving the page", description: "The page’s Listen control opens the same bottom reader used in Mneme. Move between paragraphs, pause, and choose a speed or system voice." },
  { name: "Recording", title: "Capture the explanation in context", description: "A recording block sits in the editor alongside the material it belongs to. The cassette controls are the same surface used to record, pause, replay, and save audio." },
  { name: "Transcription", title: "Turn audio into editable notes", description: "Once the recording is saved, Mneme shows its transcript in the block. You can edit the text, insert it into the page, or run it through an AI action." }
];

export default function InteractiveProductShowcase() {
  const [feature, setFeature] = useState<PreviewFeature>("Read aloud");
  const selected = features.find((item) => item.name === feature) ?? features[0];

  return (
    <section className="feature-preview">
      <div className="feature-preview-tabs" role="tablist" aria-label="Mneme features">
        {features.map(({ name, description }) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={feature === name}
            aria-controls="feature-preview-window"
            onClick={() => setFeature(name)}
          >
            <strong>{name}</strong>
            <span>{description}</span>
          </button>
        ))}
      </div>
      <header className="feature-preview-detail">
        <p>{selected.name}</p>
        <h2>{selected.title}</h2>
        <span>{selected.description}</span>
      </header>
      <div id="feature-preview-window" role="tabpanel" aria-label={feature}>
        <ProductShowcase key={feature} feature={feature} />
      </div>
    </section>
  );
}
