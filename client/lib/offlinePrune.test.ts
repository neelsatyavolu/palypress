import assert from "node:assert/strict";

import { selectPruneVictims, type OfflineIndex } from "./offlinePrune";

const idx: OfflineIndex = {
  1: { reason: "saved", cachedAt: 100 },
  2: { reason: "recent", cachedAt: 200 },
  3: { reason: "recent", cachedAt: 300 },
  4: { reason: "recent", cachedAt: 400 },
};

assert.ok(
  !selectPruneVictims(idx, 1).includes(1),
  "should never evict saved articles",
);

assert.deepEqual(
  selectPruneVictims(idx, 1).sort((a, b) => a - b),
  [2, 3],
  "should evict oldest recent entries beyond the cap",
);

assert.deepEqual(
  selectPruneVictims(idx, 10),
  [],
  "should evict nothing when under the cap",
);

console.log("offlinePrune.test.ts passed");
