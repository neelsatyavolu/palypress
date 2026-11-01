import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = readFileSync(path.join(__dirname, "offlineStore.ts"), "utf8");

assert.match(
  source,
  /from\s+["']\.\/offlinePrune["']/,
  "should import pure pruning helper/types from ./offlinePrune",
);

for (const fn of [
  "cacheArticle",
  "getCachedArticle",
  "removeCachedArticle",
  "pruneRecent",
]) {
  assert.match(
    source,
    new RegExp(`export async function ${fn}\\(`),
    `should define ${fn}`,
  );
}

assert.match(
  source,
  /from\s+["']expo-file-system(\/legacy)?["']/,
  "should use expo-file-system for article bodies",
);

assert.match(
  source,
  /from\s+["']@react-native-async-storage\/async-storage["']/,
  "should use AsyncStorage for the index",
);

assert.match(
  source,
  /reason\s*===\s*["']saved["']\s*\?\s*["']saved["']\s*:\s*reason/,
  "should apply the saved-precedence rule",
);

console.log("offlineStore.test.ts passed");
