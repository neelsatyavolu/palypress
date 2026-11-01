import assert from "node:assert/strict";

import { handleSearchBack } from "./searchNavigation";

const calls: string[] = [];

handleSearchBack(
  {
    canGoBack: () => true,
    goBack: () => calls.push("goBack"),
  },
  () => calls.push("dismissKeyboard"),
);

assert.deepEqual(
  calls,
  ["dismissKeyboard", "goBack"],
  "search back should dismiss the keyboard and still navigate back",
);

const noHistoryCalls: string[] = [];

handleSearchBack(
  {
    canGoBack: () => false,
    goBack: () => noHistoryCalls.push("goBack"),
  },
  () => noHistoryCalls.push("dismissKeyboard"),
);

assert.deepEqual(
  noHistoryCalls,
  ["dismissKeyboard"],
  "search back should not call goBack when the stack has no previous route",
);
