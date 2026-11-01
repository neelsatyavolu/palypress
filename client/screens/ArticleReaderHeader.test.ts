import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const articleDetailScreen = readFileSync(
  path.join(process.cwd(), "client/screens/ArticleDetailScreen.tsx"),
  "utf8",
);

assert.match(
  articleDetailScreen,
  /headerRight:\s*\(\{\s*tintColor\s*\}\)\s*=>/,
  "reader settings header button should use the navigator tint color",
);

assert.match(
  articleDetailScreen,
  /styles\.readerSettingsButton/,
  "reader settings header button should use a stable compact button style",
);

assert.match(
  articleDetailScreen,
  /styles\.readerSettingsButtonPressed/,
  "reader settings header button should provide pressed feedback without changing layout",
);

assert.match(
  articleDetailScreen,
  /styles\.readerSettingsButtonText,\s*\{\s*color:\s*tintColor\s*\?\?\s*theme\.text\s*\}/,
  "reader settings header label should use header tint color with a theme fallback",
);

assert.match(
  articleDetailScreen,
  /readerSettingsButton:\s*\{[\s\S]*?width:\s*36,[\s\S]*?height:\s*36,[\s\S]*?borderRadius:\s*18,[\s\S]*?alignItems:\s*"center",[\s\S]*?justifyContent:\s*"center",[\s\S]*?\}/,
  "reader settings header button should have explicit compact dimensions and centered contents",
);

console.log("ArticleReaderHeader.test.ts: all assertions passed");
