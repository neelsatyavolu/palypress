import assert from "node:assert/strict";

import {
  DEFAULT_READER_PREFERENCES,
  normalizeReaderPreferences,
  resolveAppFontFamily,
} from "./appearancePreferences";

const fontMap = {
  sans: "system",
  rounded: "rounded",
};

assert.deepEqual(
  normalizeReaderPreferences({
    fontSize: 20,
    fontFamily: "serif",
    lineSpacing: "spacious",
    appFontFamily: "rounded",
  }),
  {
    fontSize: 20,
    fontFamily: "serif",
    lineSpacing: "spacious",
    appFontFamily: "rounded",
  },
  "stored reader and app font preferences should be preserved",
);

assert.deepEqual(
  normalizeReaderPreferences({
    fontSize: 30,
    fontFamily: "comic",
    lineSpacing: "wide",
  }),
  {
    ...DEFAULT_READER_PREFERENCES,
    fontSize: 22,
  },
  "legacy or invalid stored preferences should fall back safely",
);

assert.equal(
  resolveAppFontFamily("rounded", fontMap),
  fontMap.rounded,
  "rounded app font should resolve to the configured rounded face",
);

assert.equal(
  resolveAppFontFamily("system", fontMap),
  fontMap.sans,
  "system app font should resolve to the configured sans face",
);
