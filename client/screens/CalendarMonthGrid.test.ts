import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const sourcePath = path.join(
  process.cwd(),
  "client/screens/CalendarScreen.tsx",
);
const sourceText = readFileSync(sourcePath, "utf8");

const dayCellMatch = sourceText.match(/dayCell:\s*\{([\s\S]*?)\n  \},/);
assert.ok(dayCellMatch, "calendar should define day cell styles");

const dayCellStyle = dayCellMatch[1];

assert.doesNotMatch(
  dayCellStyle,
  /aspectRatio:\s*1/,
  "calendar day rows should not reserve square-cell vertical space",
);

const heightMatch = dayCellStyle.match(/height:\s*(\d+)/);
assert.ok(heightMatch, "calendar day cells should use a fixed compact height");
assert.ok(
  Number(heightMatch[1]) <= 52,
  "calendar day cells should stay compact on wide screens",
);
