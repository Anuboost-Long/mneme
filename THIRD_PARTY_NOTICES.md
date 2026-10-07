# Third-party notices

The components below ship inside mneme's native build through Chain
(`chain-core`). Downloadable models aren't part of the build; each one's
license is shown in Settings → Extensions.

**Still to do before release:** include each component's full license
text (and the Apache-2.0 `NOTICE` files, where upstream ships one) in the
app itself, for example in the About screen. Take them from the pinned
upstream sources. This list is not a substitute for those texts.

## Speech engine (chain-sdk request 21)

sherpa-onnx 1.13.8, the official **no-TTS** static build, so no espeak-ng
or piper-phonemize (GPL-3) is linked. See chain-sdk
`agent-docs/capabilities/models/research/LICENSING.md`.

| Component                              | License      | Source                                           |
| -------------------------------------- | ------------ | ------------------------------------------------ |
| sherpa-onnx (core and C API)           | Apache-2.0   | https://github.com/k2-fsa/sherpa-onnx            |
| kaldi-native-fbank                     | Apache-2.0   | https://github.com/csukuangfj/kaldi-native-fbank |
| kaldi-decoder                          | Apache-2.0   | https://github.com/k2-fsa/kaldi-decoder          |
| kaldifst / OpenFST                     | Apache-2.0   | https://github.com/k2-fsa/kaldifst               |
| simple-sentencepiece                   | Apache-2.0   | https://github.com/pkufool/simple-sentencepiece  |
| kissfft                                | BSD-3-Clause | https://github.com/mborgerding/kissfft           |
| ONNX Runtime                           | MIT          | https://github.com/microsoft/onnxruntime         |
| FFI declarations from sherpa-onnx-sys  | Apache-2.0   | https://crates.io/crates/sherpa-onnx-sys         |
| symphonia (audio decoding, unmodified) | MPL-2.0      | https://github.com/pdeljanov/Symphonia           |

## Voices (request 21 part 2, enabled by `chain.gpl`)

Accepted 28 September 2026: sherpa-onnx's TTS-enabled build links
**espeak-ng (GPL-3.0), piper-phonemize and ucd**. A distributed
mneme build must be offered under GPL-3-compatible terms, including
source availability.

## Echo cancellation (chain-sdk request 33)

Vendored at `chain-sdk/crates/core/vendor/speexdsp` (license in `COPYING`)
and compiled into `chain-core`; used to remove the speakers' echo when
recording the microphone and computer audio together.

| Component      | License      | Source                                |
| -------------- | ------------ | ------------------------------------- |
| SpeexDSP 1.2.1 | BSD-3-Clause | https://gitlab.xiph.org/xiph/speexdsp |
