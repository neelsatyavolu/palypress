import assert from "node:assert/strict";

import {
  ARTICLE_AD_PLACEMENT,
  getArticleContentWithAdSlots,
  getFeedItemsWithSponsoredSlots,
  isSponsoredFeedAd,
  PALY_MAC_BOOSTERS_URL,
  PUBLICATION_AD_PLACEMENT,
  type SnoAdConfig,
  SPONSORED_AD,
  SPONSORED_FEED_PLACEMENTS,
} from "./articleAds";

const content = [
  { type: "paragraph", content: "One" },
  { type: "image", src: "https://example.com/photo.jpg" },
  { type: "paragraph", content: "Two" },
  { type: "paragraph", content: "Three" },
  { type: "paragraph", content: "Four" },
] as any;

const palyVoiceContent = getArticleContentWithAdSlots(content);

assert.equal(
  palyVoiceContent.filter((element: any) => element.type === "advertisement")
    .length,
  1,
  "articles should include exactly one ad slot",
);

assert.equal(
  palyVoiceContent.findIndex(
    (element: any) => element.type === "advertisement",
  ),
  3,
  "article ad slot should appear after the second paragraph",
);

assert.deepEqual(
  getArticleContentWithAdSlots([{ type: "paragraph", content: "One" }] as any),
  [{ type: "paragraph", content: "One" }],
  "short articles should not receive app-inserted ad slots",
);

assert.equal(
  SPONSORED_AD.url,
  PALY_MAC_BOOSTERS_URL,
  "sponsored ad should promote Paly MAC Boosters",
);

const shortFeedItems = getFeedItemsWithSponsoredSlots([
  { id: 1 },
  { id: 2 },
  { id: 3 },
  { id: 4 },
  { id: 5 },
]);

assert.equal(
  shortFeedItems.length,
  5,
  "feeds should not show a trailing ad after exactly five stories",
);

const feedItems = getFeedItemsWithSponsoredSlots(
  Array.from({ length: 12 }, (_, index) => ({ id: index + 1 })),
);

assert.equal(
  feedItems.length,
  14,
  "feed should keep every story and add repeated sponsored slots",
);

assert.ok(
  isSponsoredFeedAd(feedItems[5]),
  "first sponsored slot should appear after the fifth story",
);

assert.ok(
  isSponsoredFeedAd(feedItems[11]),
  "second sponsored slot should appear after the tenth story",
);

assert.notEqual(
  isSponsoredFeedAd(feedItems[5]) && feedItems[5].id,
  isSponsoredFeedAd(feedItems[11]) && feedItems[11].id,
  "repeated sponsored slots should have stable unique keys",
);

assert.equal(
  SPONSORED_FEED_PLACEMENTS.homeFeed.interval,
  5,
  "home feed ad cadence should be configured in one place",
);

assert.equal(
  SPONSORED_FEED_PLACEMENTS.searchResults.enabled,
  true,
  "search result ads should be enabled from the shared placement config",
);

assert.equal(
  SPONSORED_FEED_PLACEMENTS.authorStories.enabled,
  true,
  "author story ads should be enabled from the shared placement config",
);

assert.equal(
  ARTICLE_AD_PLACEMENT.paragraphOffset,
  2,
  "article body ad placement should be configured in one place",
);

assert.ok(
  isSponsoredFeedAd(
    getFeedItemsWithSponsoredSlots(
      Array.from({ length: 6 }, (_, index) => ({ id: index + 1 })),
      "searchResults",
    )[5],
  ),
  "search results should use the shared sponsored feed insertion helper",
);

// --- Publication (SNOD) in-content ad ---

const snoAds: SnoAdConfig = { clientId: "2101", inContentSpotId: "5915" };

assert.equal(
  content.filter((element: any) => element.type === "publicationAd").length,
  0,
  "publications without a SNOD config should not get a real-ad slot",
);

const campanileContent = getArticleContentWithAdSlots(content, snoAds);

const publicationAds = campanileContent.filter(
  (element: any) => element.type === "publicationAd",
);

assert.equal(
  publicationAds.length,
  1,
  "a publication with SNOD config should get exactly one real-ad slot",
);

assert.equal(
  publicationAds[0].spotId,
  "5915",
  "the publication ad slot should carry the configured in-content spot id",
);

assert.equal(
  publicationAds[0].clientId,
  "2101",
  "the publication ad slot should carry the configured client id",
);

assert.equal(
  campanileContent.filter((element: any) => element.type === "advertisement")
    .length,
  1,
  "the house sponsored card should remain alongside the publication ad",
);

assert.ok(
  campanileContent.findIndex(
    (element: any) => element.type === "publicationAd",
  ) >
    campanileContent.findIndex(
      (element: any) => element.type === "advertisement",
    ),
  "the publication ad should sit deeper in the article than the house card",
);

assert.deepEqual(
  getArticleContentWithAdSlots(
    [
      { type: "paragraph", content: "One" },
      { type: "paragraph", content: "Two" },
      { type: "paragraph", content: "Three" },
    ] as any,
    snoAds,
  ).filter((element: any) => element.type === "publicationAd"),
  [],
  "articles shorter than the publication ad offset should not receive one",
);

assert.equal(
  PUBLICATION_AD_PLACEMENT.paragraphOffset,
  4,
  "publication ad placement should be configured in one place",
);

// A detected paragraph offset (from the article page) overrides the default.
const detectedOffsetContent = getArticleContentWithAdSlots(
  [
    { type: "paragraph", content: "One" },
    { type: "paragraph", content: "Two" },
    { type: "paragraph", content: "Three" },
    { type: "paragraph", content: "Four" },
  ] as any,
  { ...snoAds, paragraphOffset: 3 },
);

const detectedPubIndex = detectedOffsetContent.findIndex(
  (element: any) => element.type === "publicationAd",
);

assert.equal(
  detectedOffsetContent[detectedPubIndex - 1].content,
  "Three",
  "a detected paragraph offset should place the ad after that paragraph",
);
