import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = readFileSync(
  path.join(__dirname, "SavedArticlesContext.tsx"),
  "utf8",
);

assert.match(
  source,
  /import\s*\{\s*cacheArticle,\s*removeCachedArticle\s*\}\s*from\s*["']@\/lib\/offlineStore["']/,
  "should import cacheArticle and removeCachedArticle from the offline store",
);

const saveArticleMatch = source.match(
  /const saveArticle = async \(article: \{[\s\S]*?\n  \};/,
);
assert.ok(saveArticleMatch, "should define saveArticle");
const saveArticleBody = saveArticleMatch[0];

assert.match(
  saveArticleBody,
  /cacheArticle\(\s*fullArticle,\s*["']saved["']\s*\)/,
  'saveArticle should call cacheArticle(fullArticle, "saved")',
);

assert.match(
  saveArticleBody,
  /try\s*\{\s*await cacheArticle\(\s*fullArticle,\s*["']saved["']\s*\);\s*\}\s*catch/,
  "the cacheArticle call should be wrapped in try/catch so it cannot block the save",
);

const unsaveArticleMatch = source.match(
  /const unsaveArticle = async \(articleId: number\) => \{[\s\S]*?\n  \};/,
);
assert.ok(unsaveArticleMatch, "should define unsaveArticle");
const unsaveArticleBody = unsaveArticleMatch[0];

assert.match(
  unsaveArticleBody,
  /removeCachedArticle\(articleId\)/,
  "unsaveArticle should call removeCachedArticle(articleId)",
);

assert.match(
  unsaveArticleBody,
  /try\s*\{\s*await removeCachedArticle\(articleId\);\s*\}\s*catch/,
  "the removeCachedArticle call should be wrapped in try/catch so it cannot block the unsave",
);

console.log("SavedArticlesContext.OfflineCache.test.ts passed");
