import type { Publication } from "@/constants/publications";
import { getPrimaryCategory } from "@/lib/articleUtils";
import type { Article, ArticleWithSource } from "@/types/article";

export function getArticlePublicationId(
  article?: Article,
  routePublicationId?: string,
): string | undefined {
  if (routePublicationId) return routePublicationId;
  if (article && "publicationId" in article) {
    return (article as ArticleWithSource).publicationId;
  }
  return undefined;
}

export function getRelatedArticlesUrl(
  article: Article,
  publication: Publication,
  perPage = 3,
): string | null {
  if (!publication.apiBaseUrl) return null;

  const category = getPrimaryCategory(article);
  if (!category) return null;

  return `${publication.apiBaseUrl}/posts?_embed&categories=${category.id}&per_page=${perPage}&exclude=${article.id}`;
}
