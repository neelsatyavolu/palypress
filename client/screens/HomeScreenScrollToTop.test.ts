import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const sourcePath = path.join(process.cwd(), "client/screens/HomeScreen.tsx");
const source = readFileSync(sourcePath, "utf8");

assert.match(
  source,
  /useScrollToTop/,
  "HomeScreen should register a scroll-to-top handler for repeated News tab presses",
);

assert.match(
  source,
  /feedListRef\.current\?\.scrollToOffset\(\{\s*offset: 0,\s*animated: true,?\s*\}\)/,
  "native feed should scroll to offset 0 when the active News tab is pressed",
);

assert.match(
  source,
  /webFeedScrollRef\.current\?\.scrollTo\(\{\s*y: 0,\s*animated: true,?\s*\}\)/,
  "web feed should scroll to y=0 when the active News tab is pressed",
);

assert.match(
  source,
  /<Animated\.FlatList[\s\S]*?ref=\{feedListRef\}/,
  "native feed FlatList should use the scroll-to-top ref",
);

assert.match(
  source,
  /<Animated\.ScrollView[\s\S]*?ref=\{webFeedScrollRef\}/,
  "web feed ScrollView should use the scroll-to-top ref",
);
