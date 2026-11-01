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
  /const\s+selectedMonthKey\s*=\s*getMonthKey\(selectedDate\)/,
  "calendar should key event fetching by month, not by selected day",
);

const fetchEventsMatch = sourceText.match(
  /const fetchEvents = useCallback\([\s\S]*?\n\s*\[([^\]]*)\],\n\s*\);/,
);
assert.ok(fetchEventsMatch, "calendar should define a memoized fetchEvents");

const fetchEventsDeps = fetchEventsMatch[1];

assert.match(
  fetchEventsDeps,
  /selectedMonthKey/,
  "fetchEvents should update only when the selected month changes",
);

assert.doesNotMatch(
  fetchEventsDeps,
  /selectedDate/,
  "switching days in the same month should not refetch and flash loading",
);

assert.match(
  sourceText,
  /getMonthRange\(selectedMonthKey\)/,
  "calendar should fetch the visible month from the stable month key",
);
