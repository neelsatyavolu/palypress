const APP_LINK_ORIGIN = "https://palyjournalism.com";

type ArticleShareInput = {
  articleId: number | string;
  headline: string;
  publicationId: string;
  /** Direct link to the article on the publication's site, when available. */
  articleUrl?: string;
};

export function getArticleDeepLink({
  articleId,
  publicationId,
}: Pick<ArticleShareInput, "articleId" | "publicationId">): string {
  return `${APP_LINK_ORIGIN}/app/article/${encodeURIComponent(
    publicationId,
  )}/${encodeURIComponent(String(articleId))}`;
}

export function getArticleSharePayload({
  articleId,
  headline,
  publicationId,
  articleUrl,
}: ArticleShareInput) {
  // Prefer the direct article link; fall back to the app deep link.
  const url =
    articleUrl?.trim() || getArticleDeepLink({ articleId, publicationId });

  return {
    message: `${headline}\n\n${url}`,
    title: headline,
    url,
  };
}
