import { desktop, type ChainError } from "@chain/sdk";
import { useSyncExternalStore } from "react";

import { errorMessage } from "../../../shared/lib/errorMessage";
import { searchModels, type SearchExtension } from "../../extensions/lib/catalog";
import { isReady, refreshExtensions } from "../../extensions/lib/extensionsState";
import {
  countIndexedPages,
  deleteStalePassages,
  getLivePageIds,
  getPagePassages,
  getPagesToIndex,
  getSearchablePassages,
  replacePagePassages
} from "./passage/actions";
import type { Passage, PassageMatch, SearchablePassage } from "./passage/types";
import { splitIntoPassages } from "./passages";

export type SearchIndexState =
  | { status: "off" }
  | { status: "indexing"; model: string; done: number; total: number }
  | { status: "ready"; model: string; pages: number }
  | { status: "error"; model: string; message: string };

const BATCH_SIZE = 8;

let state: SearchIndexState = { status: "off" };
let running: Promise<void> | null = null;
let searchable: { model: string; passages: SearchablePassage[] } | null = null;
const listeners = new Set<() => void>();

function setState(next: SearchIndexState) {
  state = next;
  listeners.forEach((listener) => listener());
}

export async function activeSearchModel(): Promise<SearchExtension | undefined> {
  const installed = await refreshExtensions();
  return searchModels.find((model) => isReady(model, installed));
}

function embeddingError(error: unknown) {
  switch ((error as ChainError | null)?.code) {
    case "NOT_FOUND":
      return "The search model’s files are missing. Remove it in Extensions and download it again.";
    case "TOO_LARGE":
      return "Ran out of memory while indexing. Close other apps and try again.";
    case "UNSUPPORTED":
      return "Search by meaning isn’t available on this system.";
    default:
      return errorMessage(error, "Couldn’t index your pages. Try again.");
  }
}

async function embedPassages(model: SearchExtension, texts: string[]) {
  if (texts.length === 0) return [];
  const { vectors } = await desktop.embeddings.embed(texts, {
    modelId: model.manifest.id,
    config: model.config,
    as: "passage",
    batchSize: BATCH_SIZE
  });
  return vectors;
}

async function indexPage(model: SearchExtension, page: { id: number; title: string; content: string | null; updated_at: string }) {
  const id = model.manifest.id;
  const texts = splitIntoPassages(page.title, page.content);
  const known = new Map((await getPagePassages(page.id, id)).map((passage) => [passage.text, passage.vector]));
  const missing = [...new Set(texts.filter((text) => !known.has(text)))];
  const vectors = await embedPassages(model, missing);
  missing.forEach((text, index) => known.set(text, vectors[index]));
  const passages: Passage[] = texts.map((text, position) => ({ position, text, vector: known.get(text) as Float32Array }));
  await replacePagePassages(page.id, id, page.updated_at, passages);
}

async function runUpdate() {
  const model = await activeSearchModel();
  if (!model) {
    searchable = null;
    setState({ status: "off" });
    return;
  }
  const id = model.manifest.id;
  try {
    await deleteStalePassages(id);
    const pages = await getPagesToIndex(id);
    for (const [done, page] of pages.entries()) {
      setState({ status: "indexing", model: id, done, total: pages.length });
      await indexPage(model, page);
    }
    if (pages.length > 0) {
      searchable = null;
      await desktop.embeddings.unload();
    }
    setState({ status: "ready", model: id, pages: await countIndexedPages(id) });
  } catch (error) {
    setState({ status: "error", model: id, message: embeddingError(error) });
  }
}

export function updateSearchIndex() {
  running ??= runUpdate().finally(() => {
    running = null;
  });
  return running;
}

export async function searchByMeaning(query: string, limit = 8): Promise<PassageMatch[]> {
  const model = await activeSearchModel();
  if (!model || !query.trim()) return [];
  const id = model.manifest.id;
  if (searchable?.model !== id) searchable = { model: id, passages: await getSearchablePassages(id) };
  const { passages } = searchable;
  if (passages.length === 0) return [];
  const {
    vectors: [asked]
  } = await desktop.embeddings.embed([query.trim()], { modelId: id, config: model.config, as: "query" });
  const live = await getLivePageIds();
  const best = new Map<number, PassageMatch>();
  for (const { vector, ...passage } of passages) {
    if (!live.has(passage.page_id)) continue;
    let score = 0;
    for (let index = 0; index < asked.length; index++) score += asked[index] * vector[index];
    const current = best.get(passage.page_id);
    if (!current || score > current.score) best.set(passage.page_id, { ...passage, score });
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useSearchIndex() {
  return useSyncExternalStore(subscribe, () => state);
}
