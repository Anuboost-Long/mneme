# Capability Request 37 — On-device text embeddings

Source: `AI Learning Workspace — Development Roadmap.md`, Phase 30
("Search"): "Semantic search" and "Vector embeddings". mneme's plan is
in `docs/features/30-search.md`.

## The problem

mneme searches by words. A student who asks "why do people hack" should
find the "Motives: what drives an attacker" section of their cyber
threats chapter, which shares none of those words. That needs text
turned into vectors by a sentence-embedding model, on the device: the
student's notes and course material must not be sent anywhere to be
searched.

The webview can't do this well on its own: running an ONNX model in
WebAssembly is slow on a whole library, and model files belong in the
models capability's managed store, not the app's bundle. chain-core
already links ONNX Runtime (request 21), so the native side is the right
place.

## What's asked for

The exact shape is chain-sdk's contract decision (rule 1). Each of the
following is a requirement.

### Models

- **Use the models capability** for the model files: the app's catalog
  names an embedding model (an ONNX file plus its tokenizer, for example
  a Hugging Face `tokenizer.json`), the student downloads it, and the
  embedding API loads it by its installed id. Catalogs stay app-side, as
  for speech models.
- **Model settings the app passes or the model pack declares**, all
  required options with documented defaults:
  - `pooling`: `"mean"` (default) or `"cls"`;
  - `normalize`: L2-normalize each vector (default `true`);
  - `maxTokens`: the model's input limit (default: the model's own);
  - `queryPrefix` / `passagePrefix`: text put in front of queries and
    passages (default none; e5 models need `"query: "` / `"passage: "`).
- Models mneme intends to list, all MIT-licensed: `intfloat/multilingual-e5-small`
  (384 dimensions, many languages) and `BAAI/bge-small-en-v1.5`
  (384 dimensions, English). Any BERT-style sentence-embedding ONNX
  export with a Hugging Face tokenizer should work.

### Embedding

- **Embed a batch of texts** with an installed model, as either queries
  or passages (which prefix applies), returning one vector per text, the
  vector length, and, per text, its token count and whether it was
  truncated to `maxTokens`.
- **Batch size** as an option (default chosen by chain-sdk), so the app
  can index a large library without one huge call.
- **Count tokens** for texts without embedding them, with the model's
  own tokenizer, so the app can split pages into passages that fit.
- **Runs off the UI thread** and can be **cancelled** (the student
  closes the app or switches model mid-index).
- Vectors come back as typed arrays (`Float32Array`), not JSON number
  lists, so a few thousand passages don't cost megabytes of JSON.
- Deterministic: the same text and model give the same vector, so the
  app can skip re-embedding unchanged passages.

### Availability and errors

- `availability()` says whether embeddings work here and which options
  are supported.
- Normalized errors (rule 5): model not installed, model files invalid
  or not an embedding model, tokenizer missing, cancelled, out of
  memory.

### Windows parity (rule 3)

The same API on Windows through the same ONNX Runtime build.

## Out of scope

- Storing vectors or searching them: mneme stores them in its own
  SQLite table and ranks with cosine similarity in JS (a student's
  library is thousands of passages, not millions).
- Downloading models outside the models capability.
- Generating text, reranking, or any model other than sentence
  embeddings.

## What mneme will do with it

See `docs/features/30-search.md`: index each page's passages on the
device, add **By meaning** results to ⌘P, and give the Ask assistant a
`search_by_meaning` tool.

## Please update in mneme when done

Update mneme's `@chain/sdk` and the capability's CONTRACT.md, then
signal the mneme session.
