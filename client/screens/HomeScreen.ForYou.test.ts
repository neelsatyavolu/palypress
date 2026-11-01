import { readFileSync } from "fs";
import { join } from "path";
import assert from "assert";

const source = readFileSync(join(__dirname, "HomeScreen.tsx"), "utf-8");

// useFollows is imported and used
assert.match(
  source,
  /import\s*\{\s*useFollows\s*\}\s*from\s*["']@\/contexts\/FollowsContext["']/,
  "useFollows must be imported from @/contexts/FollowsContext",
);
assert.match(
  source,
  /const\s*\{\s*followedPublicationIds\s*\}\s*=\s*useFollows\(\)/,
  "followedPublicationIds must be destructured from useFollows()",
);

// feedMode state exists
assert.match(
  source,
  /const\s*\[\s*feedMode\s*,\s*setFeedMode\s*\]\s*=\s*useState\s*<\s*["']all["']\s*\|\s*["']forYou["']\s*>\s*\(\s*["']all["']\s*\)/,
  "feedMode state must exist with default 'all'",
);

// useUnifiedFeed call includes publicationIds
assert.match(
  source,
  /useUnifiedFeed\s*\(\s*\{[\s\S]*?publicationIds\s*:[\s\S]*?\}\s*\)/,
  "useUnifiedFeed call must include a publicationIds field",
);

// guard references feedMode === "forYou" and followedPublicationIds.size
assert.match(
  source,
  /feedMode\s*===\s*["']forYou["']/,
  "guard must check feedMode === 'forYou'",
);
assert.match(
  source,
  /followedPublicationIds\.size/,
  "guard must check followedPublicationIds.size",
);

// setFeedMode("forYou") and setFeedMode("all") appear
assert.match(
  source,
  /setFeedMode\(\s*["']forYou["']\s*\)/,
  "setFeedMode('forYou') must be called somewhere (e.g. a For You toggle)",
);
assert.match(
  source,
  /setFeedMode\(\s*["']all["']\s*\)/,
  "setFeedMode('all') must be called somewhere (e.g. an All toggle)",
);

console.log("HomeScreen.ForYou.test.ts: all assertions passed");
