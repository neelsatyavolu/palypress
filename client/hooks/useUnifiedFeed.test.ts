import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const sourcePath = path.join(
  process.cwd(),
  "client/hooks/useUnifiedFeed.ts",
);
const source = readFileSync(sourcePath, "utf8");

// (a) selectFeedPublicationIds is exported
assert.match(
  source,
  /export\s+function\s+selectFeedPublicationIds\s*\(/,
  "selectFeedPublicationIds should be an exported function",
);

// (b) returns all publications when the filter is empty/undefined
assert.match(
  source,
  /if\s*\(\s*!filter\s*\|\|\s*filter\.length\s*===\s*0\s*\)\s*return\s+all\s*;/,
  "selectFeedPublicationIds should fall back to all ids when filter is undefined or empty",
);
assert.match(
  source,
  /FEED_PUBLICATIONS\.map\s*\(\s*\(\s*p\s*\)\s*=>\s*p\.id\s*\)/,
  "selectFeedPublicationIds should derive the full id list from FEED_PUBLICATIONS",
);

// (c) UseUnifiedFeedOptions includes publicationIds
assert.match(
  source,
  /interface\s+UseUnifiedFeedOptions\s*\{[^}]*publicationIds\?\s*:\s*string\[\]/s,
  "UseUnifiedFeedOptions should include an optional publicationIds field",
);

// (d) the hook calls selectFeedPublicationIds(
assert.match(
  source,
  /selectFeedPublicationIds\s*\(\s*options\.publicationIds\s*\)/,
  "useUnifiedFeed should call selectFeedPublicationIds(options.publicationIds)",
);

console.log("useUnifiedFeed.test.ts: all assertions passed");
