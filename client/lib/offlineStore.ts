import * as FileSystem from "expo-file-system/legacy";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ArticleWithSource } from "@/types/article";

import {
  selectPruneVictims,
  type CacheReason,
  type OfflineIndex,
} from "./offlinePrune";

export type { CacheReason, IndexEntry, OfflineIndex } from "./offlinePrune";
export { selectPruneVictims } from "./offlinePrune";

const DIR = FileSystem.documentDirectory + "offline/";
const INDEX_KEY = "@paly/offline_index";

async function readIndex(): Promise<OfflineIndex> {
  const raw = await AsyncStorage.getItem(INDEX_KEY);
  return raw ? JSON.parse(raw) : {};
}
async function writeIndex(index: OfflineIndex): Promise<void> {
  await AsyncStorage.setItem(INDEX_KEY, JSON.stringify(index));
}
async function ensureDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(DIR);
  if (!info.exists)
    await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
}
const fileFor = (id: number) => `${DIR}${id}.json`;

export async function cacheArticle(
  article: ArticleWithSource,
  reason: CacheReason,
): Promise<void> {
  try {
    await ensureDir();
    await FileSystem.writeAsStringAsync(
      fileFor(article.id),
      JSON.stringify(article),
    );
    const index = await readIndex();
    const prev = index[article.id];
    // A saved article stays "saved" even if also seen as recent.
    const nextReason: CacheReason = prev?.reason === "saved" ? "saved" : reason;
    index[article.id] = { reason: nextReason, cachedAt: Date.now() };
    await writeIndex(index);
  } catch (e) {
    console.error("cacheArticle failed:", e);
  }
}

export async function getCachedArticle(
  id: number,
): Promise<ArticleWithSource | null> {
  try {
    const info = await FileSystem.getInfoAsync(fileFor(id));
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(fileFor(id));
    return JSON.parse(raw) as ArticleWithSource;
  } catch {
    return null;
  }
}

export async function getCachedArticleIds(): Promise<number[]> {
  const index = await readIndex();
  return Object.keys(index).map(Number);
}

export async function removeCachedArticle(id: number): Promise<void> {
  try {
    await FileSystem.deleteAsync(fileFor(id), { idempotent: true });
    const index = await readIndex();
    delete index[id];
    await writeIndex(index);
  } catch (e) {
    console.error("removeCachedArticle failed:", e);
  }
}

export async function pruneRecent(maxRecent = 15): Promise<void> {
  const index = await readIndex();
  const victims = selectPruneVictims(index, maxRecent);
  for (const id of victims) await removeCachedArticle(id);
}
