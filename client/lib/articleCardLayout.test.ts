import assert from "node:assert/strict";

import {
  ARTICLE_CARD_BORDER_WIDTH,
  ARTICLE_CARD_EXCERPT_FONT_SIZE,
  ARTICLE_CARD_HEADLINE_FONT_SIZE,
  FEATURED_ARTICLE_CARD_HEADLINE_FONT_SIZE,
  hasArticleCardExcerpt,
  HOME_FEED_BOTTOM_GUTTER,
  SAVED_ARTICLE_BOOKMARK_CIRCLE_SIZE,
  SAVED_ARTICLE_BOOKMARK_TEXT_GAP,
  SAVED_ARTICLE_BOOKMARK_TEXT_INSET,
} from "./articleCardLayout";

assert.equal(
  hasArticleCardExcerpt(""),
  false,
  "empty excerpts should not reserve card spacing",
);

assert.equal(
  hasArticleCardExcerpt("<p>&nbsp;</p>"),
  false,
  "HTML-only excerpts should not reserve card spacing",
);

assert.equal(
  hasArticleCardExcerpt("<p>Campers sharpened their speeches.</p>"),
  true,
  "visible excerpt text should render",
);

assert.ok(
  SAVED_ARTICLE_BOOKMARK_TEXT_INSET >=
    SAVED_ARTICLE_BOOKMARK_CIRCLE_SIZE + SAVED_ARTICLE_BOOKMARK_TEXT_GAP,
  "saved article titles should reserve room for the bookmark button",
);

assert.equal(
  ARTICLE_CARD_BORDER_WIDTH,
  0,
  "article cards should not use the added block border",
);

assert.ok(
  ARTICLE_CARD_HEADLINE_FONT_SIZE <= 17,
  "standard story headlines should stay compact",
);

assert.ok(
  FEATURED_ARTICLE_CARD_HEADLINE_FONT_SIZE <= 20,
  "featured story headlines should stay compact",
);

assert.ok(
  ARTICLE_CARD_EXCERPT_FONT_SIZE <= 13,
  "story excerpts should stay compact",
);

assert.ok(
  HOME_FEED_BOTTOM_GUTTER >= 32,
  "home feed should reserve extra space below the last story",
);
