import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const source = readFileSync(
  path.join(process.cwd(), "client/screens/CivicScreen.tsx"),
  "utf8",
);

// Uses the civic feed hook
assert.match(
  source,
  /useCivicFeed\(\)/,
  "CivicScreen should call useCivicFeed()",
);

// Uses the "Local News" heading and no longer renders the removed context cards
assert.match(
  source,
  /Local News/,
  "CivicScreen heading should read 'Local News'",
);
assert.doesNotMatch(
  source,
  /CIVIC_CONTEXT_CARDS/,
  "CivicScreen should no longer reference the removed civic context cards",
);

// Renders articles with the existing ArticleCard
assert.match(
  source,
  /<ArticleCard/,
  "CivicScreen should render articles using the existing ArticleCard component",
);

// Navigates to ArticleDetail on card press
assert.match(
  source,
  /navigation\.navigate\(\s*"ArticleDetail"/,
  "CivicScreen should navigate to ArticleDetail when a card is pressed",
);

// Shows the empty state when there are no articles
assert.match(
  source,
  /<EmptyState/,
  "CivicScreen should render the existing EmptyState component",
);

// Has an accessible header title
assert.match(
  source,
  /accessibilityRole="header"/,
  "CivicScreen's section title should have accessibilityRole=\"header\"",
);

// Wires pull-to-refresh and pagination to the hook's refetch/loadMore
assert.match(
  source,
  /onRefresh=\{refetch\}/,
  "CivicScreen should wire RefreshControl's onRefresh to refetch",
);
assert.match(
  source,
  /loadMore\(\)/,
  "CivicScreen should call loadMore on end reached",
);
