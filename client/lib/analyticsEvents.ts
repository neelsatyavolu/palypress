export const ARTICLE_COMPLETION_SCROLL_DEPTH = 85;
export const ARTICLE_COMPLETION_SECONDS = 10;

export type ArticleTrafficSource =
  | "home_feed"
  | "search"
  | "related_article"
  | "saved_article"
  | "staff_article"
  | "notification"
  | "deep_link"
  | "unknown";

export interface ArticleEngagementInput {
  articleId: string | number;
  title?: string;
  publication?: string;
  source?: ArticleTrafficSource;
  sourceDetail?: string;
  durationSeconds: number;
  maxScrollDepth: number;
  completed: boolean;
}

export function calculateScrollDepth({
  offsetY,
  viewportHeight,
  contentHeight,
}: {
  offsetY: number;
  viewportHeight: number;
  contentHeight: number;
}): number {
  if (contentHeight <= 0 || viewportHeight <= 0) {
    return 0;
  }

  const depth = ((offsetY + viewportHeight) / contentHeight) * 100;
  return Math.max(0, Math.min(100, Math.round(depth)));
}

export function hasCompletedArticle({
  maxScrollDepth,
  durationSeconds,
}: {
  maxScrollDepth: number;
  durationSeconds: number;
}): boolean {
  return (
    maxScrollDepth >= ARTICLE_COMPLETION_SCROLL_DEPTH &&
    durationSeconds >= ARTICLE_COMPLETION_SECONDS
  );
}

export function buildArticleEngagementProperties({
  articleId,
  title,
  publication,
  source,
  sourceDetail,
  durationSeconds,
  maxScrollDepth,
  completed,
}: ArticleEngagementInput): Record<string, string | number | boolean> {
  const properties: Record<string, string | number | boolean> = {
    article_id: String(articleId),
    duration_seconds: Math.max(0, Math.round(durationSeconds)),
    max_scroll_depth: Math.max(0, Math.min(100, Math.round(maxScrollDepth))),
    completed,
  };

  if (title) properties.title = title;
  if (publication) properties.publication = publication;
  if (source) properties.source = source;
  if (sourceDetail) properties.source_detail = sourceDetail;

  return properties;
}
