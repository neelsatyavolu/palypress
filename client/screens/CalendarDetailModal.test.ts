import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const sourcePath = path.join(
  process.cwd(),
  "client/screens/CalendarScreen.tsx",
);
const sourceText = readFileSync(sourcePath, "utf8");

assert.match(
  sourceText,
  /const\s+detailSheetColor\s*=/,
  "event details should use a dedicated opaque sheet background",
);

assert.match(
  sourceText,
  /backgroundColor:\s*detailSheetColor/,
  "event details sheet should not reuse the translucent event-card surface",
);

assert.doesNotMatch(
  sourceText,
  /styles\.detailSheet[\s\S]*?backgroundColor:\s*surfaceColor[\s\S]*?borderColor/,
  "event details sheet should not show calendar cards through it",
);

assert.match(
  sourceText,
  /animationType="none"/,
  "event details should not use the native slide animation for a transparent modal",
);

assert.doesNotMatch(
  sourceText,
  /animationType="slide"/,
  "event details should not slide the dim backdrop over the screen",
);

assert.match(
  sourceText,
  /Animated\.timing\(detailAnimation/,
  "event details should animate the sheet itself",
);

assert.match(
  sourceText,
  /outputRange:\s*\[24,\s*0\]/,
  "event details should use a short sheet motion instead of a full-height slide",
);
