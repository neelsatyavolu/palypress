import assert from "node:assert/strict";

import {
  buildArticleEngagementProperties,
  calculateScrollDepth,
  hasCompletedArticle,
} from "./analyticsEvents";

assert.equal(
  calculateScrollDepth({ offsetY: 0, viewportHeight: 600, contentHeight: 0 }),
  0,
  "scroll depth should be 0 when content height is not measurable",
);

assert.equal(
  calculateScrollDepth({
    offsetY: 200,
    viewportHeight: 600,
    contentHeight: 1000,
  }),
  80,
  "scroll depth should include the visible viewport in the read percentage",
);

assert.equal(
  calculateScrollDepth({
    offsetY: 900,
    viewportHeight: 600,
    contentHeight: 1000,
  }),
  100,
  "scroll depth should be capped at 100",
);

assert.equal(
  hasCompletedArticle({ maxScrollDepth: 90, durationSeconds: 20 }),
  true,
  "an article should be complete after enough scroll depth and time",
);

assert.equal(
  hasCompletedArticle({ maxScrollDepth: 90, durationSeconds: 4 }),
  false,
  "an article should not be complete from scroll depth alone",
);

assert.deepEqual(
  buildArticleEngagementProperties({
    articleId: 42,
    title: "Story",
    publication: "The Campanile",
    source: "home_feed",
    sourceDetail: "top_story",
    durationSeconds: 71.7,
    maxScrollDepth: 86.4,
    completed: true,
  }),
  {
    article_id: "42",
    title: "Story",
    publication: "The Campanile",
    source: "home_feed",
    source_detail: "top_story",
    duration_seconds: 72,
    max_scroll_depth: 86,
    completed: true,
  },
  "article engagement properties should be normalized for PostHog",
);
