export type CacheReason = "saved" | "recent";
export interface IndexEntry {
  reason: CacheReason;
  cachedAt: number;
}
export type OfflineIndex = Record<number, IndexEntry>;

export function selectPruneVictims(
  index: OfflineIndex,
  maxRecent: number,
): number[] {
  const recent = Object.entries(index)
    .filter(([, e]) => e.reason === "recent")
    .sort((a, b) => b[1].cachedAt - a[1].cachedAt) // newest first
    .map(([id]) => Number(id));
  return recent.slice(maxRecent);
}
