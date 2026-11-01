import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const sourcePath = path.join(
  process.cwd(),
  "client/screens/CalendarScreen.tsx",
);
const sourceText = readFileSync(sourcePath, "utf8");

const eventDotMatch = sourceText.match(/eventDot:\s*\{([\s\S]*?)\n  \},/);
assert.ok(eventDotMatch, "calendar should define event dot styles");

const eventDotStyle = eventDotMatch[1];

for (const property of ["height", "width"]) {
  const match = eventDotStyle.match(new RegExp(`${property}:\\s*(\\d+)`));
  assert.ok(match, `event dots should define ${property}`);
  assert.ok(
    Number(match[1]) >= 6,
    `event dots should be large enough to read in light mode (${property})`,
  );
}

assert.match(
  eventDotStyle,
  /borderWidth:\s*1/,
  "event dots should have an outline for contrast on light surfaces",
);

assert.match(
  sourceText,
  /borderColor:\s*isSelected[\s\S]*rgba\(0,0,0,0\.18\)/,
  "unselected light-mode event dots should get a subtle dark outline",
);
