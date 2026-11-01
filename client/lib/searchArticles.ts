import {
  HOME_PUBLICATION,
  Publication,
  WORDPRESS_PUBLICATIONS,
} from "@/constants/publications";
import { Article, getArticleAuthors } from "@/types/article";
import { stripHtmlTags } from "@/lib/htmlUtils";

export interface ArticleSearchRequest {
  publicationId: string;
  publicationName: string;
  publicationColor: string;
  url: string;
}

function getSearchablePublications(publication: Publication): Publication[] {
  if (publication.id === HOME_PUBLICATION.id) {
    return WORDPRESS_PUBLICATIONS;
  }

  return publication.apiBaseUrl ? [publication] : [];
}

export function getArticleSearchRequests(
  publication: Publication,
  query: string,
  page: number,
  perPage: number,
): ArticleSearchRequest[] {
  return getSearchablePublications(publication).map((searchPublication) => ({
    publicationId: searchPublication.id,
    publicationName: searchPublication.shortName,
    publicationColor: searchPublication.primaryColor,
    url: `${searchPublication.apiBaseUrl}/posts?_embed&per_page=${perPage}&page=${page}&search=${encodeURIComponent(query)}&orderby=relevance`,
  }));
}

function normalizeSearchText(value: string): string {
  return stripHtmlTags(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function scoreSearchField(
  field: string,
  phrase: string,
  tokens: string[],
  weight: number,
): number {
  if (!field) return 0;

  let score = 0;
  if (field === phrase) score += weight * 6;
  if (field.startsWith(phrase)) score += weight * 3;
  if (field.includes(phrase)) score += weight * 4;

  for (const token of tokens) {
    if (field.includes(token)) score += weight;
  }

  return score;
}

function scoreArticleSearchResult(article: Article, query: string): number {
  const phrase = normalizeSearchText(query);
  const tokens = phrase.split(" ").filter(Boolean);
  if (tokens.length === 0) return 0;

  const title = normalizeSearchText(article.title?.rendered || "");
  const author = normalizeSearchText(getArticleAuthors(article));
  const excerpt = normalizeSearchText(article.excerpt?.rendered || "");
  const content = normalizeSearchText(article.content?.rendered || "");
  const combined = `${title} ${author} ${excerpt} ${content}`.trim();
  const allTokensMatch = tokens.every((token) => combined.includes(token));

  return (
    scoreSearchField(title, phrase, tokens, 100) +
    scoreSearchField(author, phrase, tokens, 50) +
    scoreSearchField(excerpt, phrase, tokens, 35) +
    scoreSearchField(content, phrase, tokens, 10) +
    (allTokensMatch ? 50 : 0)
  );
}

export function rankArticleSearchResults<T extends Article>(
  articles: T[],
  query: string,
): T[] {
  return articles
    .map((article, index) => ({
      article,
      index,
      score: scoreArticleSearchResult(article, query),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map((result) => result.article);
}
