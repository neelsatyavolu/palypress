import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// onboardingStorage imports AsyncStorage, which can't be loaded in plain Node,
// so we assert on the source text (same convention as offlineStore.test.ts).
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const source = readFileSync(
  path.join(__dirname, "onboardingStorage.ts"),
  "utf8",
);

assert.match(
  source,
  /from\s+["']@react-native-async-storage\/async-storage["']/,
  "should use AsyncStorage for the onboarding flag",
);

for (const fn of ["getHasOnboarded", "setOnboarded"]) {
  assert.match(
    source,
    new RegExp(`export async function ${fn}\\(`),
    `should define ${fn}`,
  );
}

assert.match(
  source,
  /@palypress\/onboarding_complete_v1/,
  "should use a versioned storage key",
);

assert.match(
  source,
  /catch[\s\S]*return true/,
  "getHasOnboarded should default to true (skip onboarding) on read error",
);

console.log("onboardingStorage.test.ts passed");
