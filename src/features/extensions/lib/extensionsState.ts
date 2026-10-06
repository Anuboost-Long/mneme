import { errorMessage } from "@/shared/lib/errorMessage";
import { desktop, type ChainError, type InstalledModel } from "@chain/sdk";
import { useSyncExternalStore } from "react";

import { transcriptionModels, VAD, type Extension } from "./catalog";

export type Download = { received: number; total: number | null };

export type ExtensionsState = {
  loaded: boolean;
  // Per device: once a downloaded voice or model exists, the user can
  // stop offering this device's own voices or transcription engine.
  onlyDownloaded: Record<Extension["kind"], boolean>;
  unsupported: boolean;
  installed: Record<string, InstalledModel>;
  downloads: Record<string, Download>;
  errors: Record<string, string>;
};

// Module-level, not component state: a download keeps running natively
// after its Settings row unmounts, so its progress must outlive the screen
// that started it.
const ONLY_DOWNLOADED_KEY = "mneme.extensions.onlyDownloaded";

function storedOnlyDownloaded(): Record<Extension["kind"], boolean> {
  try {
    const saved = JSON.parse(localStorage.getItem(ONLY_DOWNLOADED_KEY) ?? "{}") as Partial<
      Record<Extension["kind"], boolean>
    >;
    return {
      voice: saved.voice === true,
      transcription: saved.transcription === true,
      search: false
    };
  } catch {
    return { voice: false, transcription: false, search: false };
  }
}

let state: ExtensionsState = {
  loaded: false,
  onlyDownloaded: storedOnlyDownloaded(),
  unsupported: false,
  installed: {},
  downloads: {},
  errors: {}
};
const listeners = new Set<() => void>();

function setState(patch: Partial<ExtensionsState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function without<T>(record: Record<string, T>, id: string) {
  const { [id]: _removed, ...rest } = record;
  return rest;
}

function installError(error: unknown) {
  switch ((error as ChainError | null)?.code) {
    case "INTEGRITY_FAILED":
      return "The download didn’t match its published checksum, so nothing was kept. Try again.";
    case "UNAVAILABLE":
      return "Couldn’t reach the download server. Check your connection and try again.";
    case "UNSUPPORTED":
      return "Extensions aren’t available on this system yet.";
    default:
      return errorMessage(error, "Couldn’t download this extension. Try again.");
  }
}

export async function refreshExtensions() {
  try {
    const models = await desktop.models.list();
    setState({
      loaded: true,
      installed: Object.fromEntries(models.map((model) => [model.id, model]))
    });
  } catch (error) {
    setState({ loaded: true, unsupported: (error as ChainError | null)?.code === "UNSUPPORTED" });
  }
  return state.installed;
}

export async function installExtension(extension: Extension) {
  const { id } = extension.manifest;
  if (state.downloads[id]) return;
  setState({
    downloads: {
      ...state.downloads,
      [id]: { received: 0, total: extension.manifest.sizeBytes ?? null }
    },
    errors: without(state.errors, id)
  });
  try {
    if (extension.kind === "transcription" && !state.installed[VAD.manifest.id])
      await desktop.models.install(VAD.manifest);
    if (extension.kind === "search" && !state.installed[extension.tokenizer.id])
      await desktop.models.install(extension.tokenizer);
    await desktop.models.install(extension.manifest, (received, total) => {
      setState({
        downloads: {
          ...state.downloads,
          [id]: { received, total: total ?? extension.manifest.sizeBytes ?? null }
        }
      });
    });
  } catch (error) {
    if ((error as ChainError | null)?.code !== "CANCELLED")
      setState({ errors: { ...state.errors, [id]: installError(error) } });
  } finally {
    setState({ downloads: without(state.downloads, id) });
    await refreshExtensions();
  }
}

export async function cancelExtension(extension: Extension) {
  await desktop.models.cancel(VAD.manifest.id);
  if (extension.kind === "search") await desktop.models.cancel(extension.tokenizer.id);
  await desktop.models.cancel(extension.manifest.id);
}

// The shared VAD goes with the last model that needs it.
export async function removeExtension(extension: Extension) {
  const { id } = extension.manifest;
  setState({ errors: without(state.errors, id) });
  try {
    await desktop.models.remove(id);
    if (extension.kind === "search") await desktop.models.remove(extension.tokenizer.id);
    const stillNeeded = transcriptionModels.some(
      (other) => other.manifest.id !== id && state.installed[other.manifest.id]
    );
    if (extension.kind === "transcription" && !stillNeeded)
      await desktop.models.remove(VAD.manifest.id);
  } catch (error) {
    setState({
      errors: {
        ...state.errors,
        [id]: errorMessage(error, "Couldn’t remove this extension. Try again.")
      }
    });
  } finally {
    await refreshExtensions();
  }
}

export function setOnlyDownloaded(kind: Extension["kind"], only: boolean) {
  const onlyDownloaded = { ...state.onlyDownloaded, [kind]: only };
  setState({ onlyDownloaded });
  try {
    localStorage.setItem(ONLY_DOWNLOADED_KEY, JSON.stringify(onlyDownloaded));
  } catch {
    return;
  }
}

export function isReady(extension: Extension, installed: Record<string, InstalledModel>) {
  if (!installed[extension.manifest.id]) return false;
  if (extension.kind === "search") return Boolean(installed[extension.tokenizer.id]);
  return extension.kind === "voice" || Boolean(installed[VAD.manifest.id]);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// For code outside React that needs the same choice as the settings.
export function onlyDownloadedFor(kind: Extension["kind"]) {
  return state.onlyDownloaded[kind];
}

export function useExtensions() {
  return useSyncExternalStore(subscribe, () => state);
}
