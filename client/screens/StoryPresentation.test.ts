import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

function readSource(relativePath: string): string {
  const absolutePath = path.join(process.cwd(), relativePath);
  return fs.existsSync(absolutePath)
    ? fs.readFileSync(absolutePath, "utf8")
    : "";
}

const homeScreen = fs.readFileSync(
  path.join(process.cwd(), "client/screens/HomeScreen.tsx"),
  "utf8",
);
const articleDetailScreen = fs.readFileSync(
  path.join(process.cwd(), "client/screens/ArticleDetailScreen.tsx"),
  "utf8",
);
const searchScreen = fs.readFileSync(
  path.join(process.cwd(), "client/screens/SearchScreen.tsx"),
  "utf8",
);
const staffDetailScreen = fs.readFileSync(
  path.join(process.cwd(), "client/screens/StaffDetailScreen.tsx"),
  "utf8",
);
const sponsoredFeedCard = readSource("client/components/SponsoredFeedCard.tsx");

assert.match(
  homeScreen,
  /getFeedItemsWithSponsoredSlots\(\s*displayArticles,\s*"homeFeed",?\s*\)/,
  "HomeScreen should use the central home feed ad placement",
);

assert.match(
  homeScreen,
  /SponsoredFeedCard/,
  "HomeScreen should render a sponsored feed card",
);

assert.match(
  searchScreen,
  /getFeedItemsWithSponsoredSlots\(\s*articles,\s*"searchResults",?\s*\)/,
  "SearchScreen should use the central search results ad placement",
);

assert.match(
  searchScreen,
  /!isSponsoredFeedAd\(item\)/,
  "SearchScreen should not track sponsored slots as article impressions",
);

assert.match(
  staffDetailScreen,
  /getFeedItemsWithSponsoredSlots\(\s*stories,\s*"authorStories",?\s*\)/,
  "StaffDetailScreen should use the central author stories ad placement",
);

assert.match(
  homeScreen,
  /HOME_FEED_BOTTOM_GUTTER/,
  "HomeScreen should reserve extra bottom space below the last story",
);

assert.match(
  articleDetailScreen,
  /publicationPill/,
  "ArticleDetailScreen should show the article publication",
);

assert.match(
  articleDetailScreen,
  /const publicationPillTextColor = isDark\s*\?\s*theme\.text\s*:\s*publication\.primaryColor/,
  "ArticleDetailScreen should keep the publication label readable in dark mode",
);

assert.match(
  articleDetailScreen,
  /const publicationPillBorderColor = isDark\s*\?\s*"rgba\(255,\s*255,\s*255,\s*0\.28\)"\s*:\s*publication\.primaryColor/,
  "ArticleDetailScreen should give the dark publication pill a visible outline",
);

assert.match(
  staffDetailScreen,
  /publicationBadge/,
  "StaffDetailScreen should show the author's publication",
);

assert.match(
  staffDetailScreen,
  /StaffArticleDetail",\s*\{\s*article,\s*publicationId: publication\.id,\s*\}/,
  "StaffDetailScreen should preserve publication when opening an author's story",
);

assert.match(
  sponsoredFeedCard,
  /accessibilityRole="link"/,
  "SponsoredFeedCard should behave like a link",
);

console.log("StoryPresentation.test.ts: all assertions passed");
