import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const source = readFileSync(
  path.join(process.cwd(), "client/navigation/CivicStackNavigator.tsx"),
  "utf8",
);

// Registers the Civic root screen
assert.match(
  source,
  /<Stack\.Screen\s+name="Civic"\s+component=\{CivicScreen\}/,
  "CivicStackNavigator should register the Civic screen with CivicScreen as its component",
);

// Registers ArticleDetail pushed from Civic
assert.match(
  source,
  /<Stack\.Screen\s+name="ArticleDetail"\s+component=\{ArticleDetailScreen\}/,
  "CivicStackNavigator should register ArticleDetail with ArticleDetailScreen as its component",
);

// Exports CivicStackParamList with the two routes
assert.match(
  source,
  /export type CivicStackParamList = \{[\s\S]*?Civic:\s*undefined;[\s\S]*?ArticleDetail:[\s\S]*?\};/,
  "CivicStackNavigator should export CivicStackParamList with Civic and ArticleDetail routes",
);

// Uses the shared screen options hook, matching HomeStackNavigator's pattern
assert.match(
  source,
  /useScreenOptions\(\)/,
  "CivicStackNavigator should use useScreenOptions() like HomeStackNavigator",
);
