import { stripHtmlTags } from "./htmlUtils";

export const SAVED_ARTICLE_BOOKMARK_CIRCLE_SIZE = 36;
export const SAVED_ARTICLE_BOOKMARK_TEXT_GAP = 8;
export const SAVED_ARTICLE_BOOKMARK_TEXT_INSET =
  SAVED_ARTICLE_BOOKMARK_CIRCLE_SIZE + SAVED_ARTICLE_BOOKMARK_TEXT_GAP;
export const ARTICLE_CARD_BORDER_WIDTH = 0;
export const ARTICLE_CARD_HEADLINE_FONT_SIZE = 16;
export const ARTICLE_CARD_HEADLINE_LINE_HEIGHT = 21;
export const FEATURED_ARTICLE_CARD_HEADLINE_FONT_SIZE = 19;
export const FEATURED_ARTICLE_CARD_HEADLINE_LINE_HEIGHT = 24;
export const ARTICLE_CARD_EXCERPT_FONT_SIZE = 13;
export const ARTICLE_CARD_EXCERPT_LINE_HEIGHT = 18;
export const HOME_FEED_BOTTOM_GUTTER = 32;

export function hasArticleCardExcerpt(excerpt: string): boolean {
  return stripHtmlTags(excerpt).length > 0;
}
