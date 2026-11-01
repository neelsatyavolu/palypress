import assert from "node:assert/strict";

import { formatDate } from "./htmlUtils";

assert.equal(formatDate("2026-06-29T12:00:00"), "Jun 29, 2026");
assert.equal(formatDate(""), "");
assert.equal(formatDate("not-a-date"), "");
