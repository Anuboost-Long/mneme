export enum ExplanationLevel {
  Any = 1,
  Beginner = 2,
  Intermediate = 3,
  Advanced = 4,
}

export enum Tone {
  Any = 1,
  Friendly = 2,
  Formal = 3,
}

export enum AnswerLength {
  Any = 1,
  Concise = 2,
  Detailed = 3,
}

type Option = { label: string; instruction: string };

export const languages: Record<string, Option> = {
  "en-AU": { label: "English (Australian)", instruction: "Write in English with Australian spelling and vocabulary" },
  "en-GB": { label: "English (British)", instruction: "Write in English with British spelling and vocabulary" },
  "en-US": { label: "English (American)", instruction: "Write in English with American spelling and vocabulary" },
  km: { label: "Khmer", instruction: "Write in Khmer" },
  "zh-Hans": { label: "Chinese (Simplified)", instruction: "Write in Simplified Chinese" },
  vi: { label: "Vietnamese", instruction: "Write in Vietnamese" },
  th: { label: "Thai", instruction: "Write in Thai" },
  ja: { label: "Japanese", instruction: "Write in Japanese" },
  ko: { label: "Korean", instruction: "Write in Korean" },
  fr: { label: "French", instruction: "Write in French" },
  es: { label: "Spanish", instruction: "Write in Spanish" },
};

export const explanationLevels: Record<ExplanationLevel, Option | null> = {
  [ExplanationLevel.Any]: null,
  [ExplanationLevel.Beginner]: { label: "Beginner", instruction: "Explain for a beginner: use plain words and define each technical term the first time it appears." },
  [ExplanationLevel.Intermediate]: { label: "Some background", instruction: "Assume some background knowledge: define only specialised terms." },
  [ExplanationLevel.Advanced]: { label: "Advanced", instruction: "Assume strong background knowledge: be precise and skip basic explanations." },
};

export const tones: Record<Tone, Option | null> = {
  [Tone.Any]: null,
  [Tone.Friendly]: { label: "Friendly", instruction: "Use a friendly, encouraging tone." },
  [Tone.Formal]: { label: "Formal", instruction: "Use a formal, academic tone." },
};

export const answerLengths: Record<AnswerLength, Option | null> = {
  [AnswerLength.Any]: null,
  [AnswerLength.Concise]: { label: "Concise", instruction: "Keep it concise." },
  [AnswerLength.Detailed]: { label: "Detailed", instruction: "Be thorough and detailed." },
};

export const toggles = {
  keepTerms: { label: "Keep technical terms", hint: "Don’t swap specialist words for simpler ones.", instruction: "Keep the original technical terminology rather than replacing it with simpler words." },
  useExamples: { label: "Use examples", hint: "Add a short example where it helps.", instruction: "Where it helps understanding, add a short example." },
  hintsForAssessed: {
    label: "Hints instead of answers to assessed questions",
    hint: "For assignment, quiz and exam questions only. Summaries, translations and other tasks aren’t affected.",
    instruction: "If the content includes assessed questions (assignment, quiz or exam questions), don’t write their answers unless explicitly asked; point to the relevant concepts and give hints instead. This only affects answering those questions, not other tasks such as summarising, translating or organising.",
  },
} satisfies Record<string, { label: string; hint: string; instruction: string }>;
