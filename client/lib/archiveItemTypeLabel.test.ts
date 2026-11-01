import assert from "node:assert/strict";

import { formatArchiveItemTypeLabel } from "./archiveItemTypeLabel";

assert.equal(formatArchiveItemTypeLabel(null), null);
assert.equal(formatArchiveItemTypeLabel("ARTICLE"), "Article");
assert.equal(
  formatArchiveItemTypeLabel("ARTICLE+ILLUSTRATION"),
  "Article + Illustration",
);
assert.equal(
  formatArchiveItemTypeLabel("TITLE_SECTION+ILLUSTRATION"),
  "Title Section + Illustration",
);

console.log("archiveItemTypeLabel.test.ts: all assertions passed");
