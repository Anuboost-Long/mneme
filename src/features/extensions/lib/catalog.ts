import type { AsrModelConfig, ModelManifest, TtsModelConfig } from "@chain/sdk";

// mneme's reviewed list of downloadable open-source models. chain-sdk's
// `desktop.models` installs whatever manifest it's given; this file is
// where a model earns its place: a license that allows commercial use,
// a pinned URL and SHA-256 (checked before anything is kept), and the
// engine config that wires it up so the user never has to.
//
// Checked 28 September 2026 against sherpa-onnx's `asr-models` and
// `tts-models` releases. Left out on purpose: non-English Moonshine
// (Moonshine Community License, non-commercial), SenseVoice (license of
// the converted weights not yet confirmed), and Piper voices (each
// voice's dataset license still to check; Amy's card only says "see URL").
// Voices need the app's GPL opt-in (package.json → chain.gpl) because
// sherpa-onnx's TTS links espeak-ng.

const ASR_RELEASE = "https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models";
const TTS_RELEASE = "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models";

export type License = { name: string; url: string };

type ExtensionBase = {
  manifest: ModelManifest;
  name: string;
  description: string;
  license: License;
};

export type TranscriptionExtension = ExtensionBase & {
  kind: "transcription";
  // BCP-47 primary tags the model transcribes; `null` = many, the user picks.
  languages: string[] | null;
  config: AsrModelConfig;
};

export type VoiceExtension = ExtensionBase & {
  kind: "voice";
  config: TtsModelConfig;
  // One per speaker id, in id order: what the read-aloud picker lists.
  voices: { name: string; language: string }[];
};

export type Extension = TranscriptionExtension | VoiceExtension;

// Every transcription model segments speech with Silero VAD, installed
// alongside the first one and removed with the last.
export const VAD = {
  manifest: {
    id: "silero-vad",
    url: `${ASR_RELEASE}/silero_vad.onnx`,
    sha256: "9e2449e1087496d8d4caba907f23e0bd3f78d91fa552479bb9c23ac09cbb1fd6",
    archive: "none",
    sizeBytes: 643_854
  },
  model: "silero_vad.onnx",
  license: { name: "MIT", url: "https://github.com/snakers4/silero-vad/blob/master/LICENSE" }
} as const satisfies { manifest: ModelManifest; model: string; license: License };

const MIT_MOONSHINE: License = {
  name: "MIT",
  url: "https://github.com/moonshine-ai/moonshine/blob/main/LICENSE"
};
const MIT_WHISPER: License = {
  name: "MIT",
  url: "https://github.com/openai/whisper/blob/main/LICENSE"
};

export const transcriptionModels: TranscriptionExtension[] = [
  {
    kind: "transcription",
    manifest: {
      id: "moonshine-tiny-en",
      url: `${ASR_RELEASE}/sherpa-onnx-moonshine-tiny-en-quantized-2026-02-27.tar.bz2`,
      sha256: "9ec31b342d8fa3240c3b81b8f82e1cf7e3ac467c93ca5a999b741d5887164f8d",
      sizeBytes: 29_858_559
    },
    name: "Moonshine Tiny (English)",
    description: "Smallest and fastest. Good for clear speech; misses uncommon words.",
    languages: ["en"],
    license: MIT_MOONSHINE,
    config: {
      type: "moonshine",
      encoder: "encoder_model.ort",
      mergedDecoder: "decoder_model_merged.ort",
      tokens: "tokens.txt"
    }
  },
  {
    kind: "transcription",
    manifest: {
      id: "moonshine-base-en",
      url: `${ASR_RELEASE}/sherpa-onnx-moonshine-base-en-quantized-2026-02-27.tar.bz2`,
      sha256: "43232c1d13013d37317163baec3135bd771a186a4356f28c889bab453bb0e891",
      sizeBytes: 111_266_225
    },
    name: "Moonshine Base (English)",
    description: "More accurate English lectures, still fast.",
    languages: ["en"],
    license: MIT_MOONSHINE,
    config: {
      type: "moonshine",
      encoder: "encoder_model.ort",
      mergedDecoder: "decoder_model_merged.ort",
      tokens: "tokens.txt"
    }
  },
  {
    kind: "transcription",
    manifest: {
      id: "whisper-base",
      url: `${ASR_RELEASE}/sherpa-onnx-whisper-base.tar.bz2`,
      sha256: "911b2083efd7c0dca2ac3b358b75222660dc09fb716d64fbfc417ba6c99ff3de",
      sizeBytes: 207_557_382
    },
    name: "Whisper Base",
    description: "Many languages, including Khmer, Thai and Vietnamese. Slower than Moonshine.",
    languages: null,
    license: MIT_WHISPER,
    config: {
      type: "whisper",
      encoder: "base-encoder.int8.onnx",
      decoder: "base-decoder.int8.onnx",
      tokens: "base-tokens.txt"
    }
  },
  {
    kind: "transcription",
    manifest: {
      id: "whisper-small",
      url: `${ASR_RELEASE}/sherpa-onnx-whisper-small.tar.bz2`,
      sha256: "486a46afbb7ba798507190ffe02fea2dd726049af212e774537efac6afb210a6",
      sizeBytes: 639_387_718
    },
    name: "Whisper Small",
    description: "The most accurate here, in many languages. A large download, and the slowest.",
    languages: null,
    license: MIT_WHISPER,
    config: {
      type: "whisper",
      encoder: "small-encoder.int8.onnx",
      decoder: "small-decoder.int8.onnx",
      tokens: "small-tokens.txt"
    }
  }
];

// Whisper's languages worth offering by name; it detects the language
// itself when none is chosen.
export const WHISPER_LANGUAGES = [
  "en",
  "km",
  "th",
  "vi",
  "zh",
  "ja",
  "ko",
  "fr",
  "es",
  "de",
  "pt",
  "ru",
  "ar",
  "hi",
  "id",
  "ms",
  "lo",
  "my"
];

// Kokoro's speaker names start with a language letter and a gender
// letter (af_heart: American English, female).
const KOKORO_LANGUAGES: Record<string, string> = {
  a: "en-US",
  b: "en-GB",
  e: "es",
  f: "fr",
  h: "hi",
  i: "it",
  j: "ja",
  p: "pt-BR",
  z: "zh"
};

const KOKORO_SPEAKERS = [
  "af_alloy",
  "af_aoede",
  "af_bella",
  "af_heart",
  "af_jessica",
  "af_kore",
  "af_nicole",
  "af_nova",
  "af_river",
  "af_sarah",
  "af_sky",
  "am_adam",
  "am_echo",
  "am_eric",
  "am_fenrir",
  "am_liam",
  "am_michael",
  "am_onyx",
  "am_puck",
  "am_santa",
  "bf_alice",
  "bf_emma",
  "bf_isabella",
  "bf_lily",
  "bm_daniel",
  "bm_fable",
  "bm_george",
  "bm_lewis",
  "ef_dora",
  "em_alex",
  "ff_siwis",
  "hf_alpha",
  "hf_beta",
  "hm_omega",
  "hm_psi",
  "if_sara",
  "im_nicola",
  "jf_alpha",
  "jf_gongitsune",
  "jf_nezumi",
  "jf_tebukuro",
  "jm_kumo",
  "pf_dora",
  "pm_alex",
  "pm_santa",
  "zf_xiaobei",
  "zf_xiaoni",
  "zf_xiaoxiao",
  "zf_xiaoyi",
  "zm_yunjian",
  "zm_yunxi",
  "zm_yunxia",
  "zm_yunyang",
  "em_santa"
];

function kokoroVoiceName(speaker: string) {
  const name = speaker.slice(3);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export const voiceModels: VoiceExtension[] = [
  {
    kind: "voice",
    manifest: {
      id: "kokoro-multi-lang-v1-0",
      url: `${TTS_RELEASE}/kokoro-multi-lang-v1_0.tar.bz2`,
      sha256: "c5f7e2d2caf082bc1d20fb70334a61d99d20b484500aad32e7cf84c128ea3298",
      sizeBytes: 349_906_910
    },
    name: "Kokoro",
    description:
      "54 natural voices in English, Spanish, French, Hindi, Italian, Japanese, Portuguese and Chinese.",
    license: { name: "Apache-2.0", url: "https://huggingface.co/hexgrad/Kokoro-82M" },
    config: {
      type: "kokoro",
      model: "model.onnx",
      voices: "voices.bin",
      tokens: "tokens.txt",
      dataDir: "espeak-ng-data",
      dictDir: "dict",
      lexicon: ["lexicon-us-en.txt", "lexicon-zh.txt"],
      speakers: KOKORO_SPEAKERS
    },
    voices: KOKORO_SPEAKERS.map((speaker) => ({
      name: kokoroVoiceName(speaker),
      language: KOKORO_LANGUAGES[speaker[0]] ?? "en-US"
    }))
  }
];

export const catalog: Extension[] = [...voiceModels, ...transcriptionModels];
