import { useState, useEffect, useCallback } from "react";
import {
  FEED_PUBLICATIONS,
  getPublicationById,
} from "@/constants/publications";
import { Article, ArticleWithSource } from "@/types/article";
import { UnifiedCategory } from "./useUnifiedCategories";
import { calculateHotScore } from "@/lib/ranking";
import { getApiUrl, apiRequest } from "@/lib/query-client";

const ARTICLES_PER_PUBLICATION = 3;

interface UseUnifiedFeedOptions {
  category?: UnifiedCategory | null;
  publicationIds?: string[];
}

export function selectFeedPublicationIds(filter?: string[]): string[] {
  const all = FEED_PUBLICATIONS.map((p) => p.id);
  if (!filter || filter.length === 0) return all;
  const set = new Set(filter);
  return all.filter((id) => set.has(id));
}

export function useUnifiedFeed(options: UseUnifiedFeedOptions = {}) {
  const { category } = options;
  const feedPublicationIds = selectFeedPublicationIds(options.publicationIds);

  const [articles, setArticles] = useState<ArticleWithSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Track pagination offset for each publication
  const [offsets, setOffsets] = useState<Map<string, number>>(new Map());

  const fetchArticlesFromPublication = useCallback(
    async (
      publicationId: string,
      offset: number,
      cacheBuster?: number,
    ): Promise<{ articles: Article[]; hasMore: boolean }> => {
      const publication = getPublicationById(publicationId);
      if (!publication) {
        return { articles: [], hasMore: false };
      }

      if (!publication.apiBaseUrl && publication.externalFeedType) {
        const url = new URL(
          `/api/publications/${publication.id}/feed`,
          getApiUrl(),
        );
        url.searchParams.set("per_page", ARTICLES_PER_PUBLICATION.toString());
        url.searchParams.set("offset", offset.toString());

        const response = await fetch(url.toString(), { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to fetch from ${publication.name}`);
        }

        const data: { articles: Article[]; hasMore: boolean } =
          await response.json();

        return data;
      }

      if (!publication.apiBaseUrl) {
        return { articles: [], hasMore: false };
      }

      let url = `${publication.apiBaseUrl}/posts?_embed&per_page=${ARTICLES_PER_PUBLICATION}&offset=${offset}`;

      // Add category filter if specified
      if (category && category.slug !== "all") {
        const mapping = category.publicationMappings.find(
          (m) => m.publicationId === publicationId,
        );
        if (mapping) {
          url += `&categories=${mapping.categoryId}`;
        } else {
          // This publication doesn't have this category
          return { articles: [], hasMore: false };
        }
      }

      if (cacheBuster !== undefined && offset === 0) {
        url += `&_=${cacheBuster}`;
      }

      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Failed to fetch from ${publication.name}`);
      }

      const data: Article[] = await response.json();
      const totalPages = parseInt(
        response.headers.get("X-WP-TotalPages") || "1",
        10,
      );
      const currentPage = Math.floor(offset / ARTICLES_PER_PUBLICATION) + 1;

      return {
        articles: data,
        hasMore: currentPage < totalPages,
      };
    },
    [category],
  );

  const buildDiverseFeed = useCallback(
    (
      articlesByPub: Map<string, Article[]>,
      upvoteCounts: Map<string, number>,
    ): ArticleWithSource[] => {
      const targetCount = feedPublicationIds.length * ARTICLES_PER_PUBLICATION;

      // Collect all articles with their scores
      const allArticles: {
        pubId: string;
        article: Article;
        score: number;
      }[] = [];

      for (const [pubId, articles] of articlesByPub) {
        for (const article of articles) {
          const key = `${pubId}-${article.id}`;
          const upvotes = upvoteCounts.get(key) || 0;
          allArticles.push({
            pubId,
            article,
            score: calculateHotScore(upvotes, new Date(article.date)),
          });
        }
      }

      // Sort by hot score (descending)
      allArticles.sort((a, b) => b.score - a.score);

      // Build feed with light diversity controls
      const feed: ArticleWithSource[] = [];
      const addedArticleIds = new Set<string>();
      const pubDateCounts = new Map<string, number>(); // Track count per publication+date

      for (const { pubId, article, score } of allArticles) {
        if (feed.length >= targetCount) break;

        const articleKey = `${pubId}-${article.id}`;
        if (addedArticleIds.has(articleKey)) continue;

        // Get the date (YYYY-MM-DD format) for grouping
        const articleDate = new Date(article.date).toISOString().split("T")[0];
        const pubDateKey = `${pubId}-${articleDate}`;
        const currentCount = pubDateCounts.get(pubDateKey) || 0;

        // Apply diversity penalty only if 4+ articles from same publication on same date
        // This allows 2-3 articles from same pub/date to appear naturally based on score
        if (currentCount >= 4) {
          // Apply a penalty by reducing the score
          // Articles with very high scores can still make it through
          const penalty = (currentCount - 3) * 2; // Increasing penalty for each article beyond 3
          const penalizedScore = score - penalty;

          // Skip if penalized score would put it below a threshold
          // (Allow it through if it's still highly scored despite penalty)
          if (penalizedScore < 0) {
            continue;
          }
        }

        const pub = getPublicationById(pubId);
        if (pub) {
          feed.push({
            ...article,
            publicationId: pubId,
            publicationName: pub.shortName,
            publicationColor: pub.primaryColor,
          });
          addedArticleIds.add(articleKey);
          pubDateCounts.set(pubDateKey, currentCount + 1);
        }
      }

      return feed;
    },
    // Use a joined primitive key instead of the array reference so this callback
    // (and everything downstream: fetchFeed, refetch, loadMore) doesn't get a new
    // identity every render just because feedPublicationIds is a new array.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [feedPublicationIds.join(",")],
  );

  // Helper to fetch upvote counts for articles
  const fetchUpvoteCounts = useCallback(
    async (
      articles: { id: number; publicationId: string }[],
    ): Promise<Map<string, number>> => {
      if (articles.length === 0) return new Map();

      try {
        const response = await apiRequest(
          "POST",
          "/api/articles/upvote-counts",
          {
            articles: articles.map((a) => ({
              articleId: a.id,
              publicationId: a.publicationId,
            })),
          },
        );

        const data = await response.json();
        const counts = new Map<string, number>();
        for (const [key, count] of Object.entries(data.counts)) {
          counts.set(key, count as number);
        }
        return counts;
      } catch (error) {
        console.error("Failed to fetch upvote counts:", error);
      }
      return new Map();
    },
    [],
  );

  const fetchFeed = useCallback(
    async (isLoadMore = false, currentOffsets?: Map<string, number>) => {
      console.log("[useUnifiedFeed] fetchFeed called", {
        isLoadMore,
        currentOffsets: currentOffsets
          ? Array.from(currentOffsets.entries())
          : undefined,
        existingOffsets: Array.from(offsets.entries()),
      });

      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        const offsetsToUse =
          currentOffsets !== undefined
            ? currentOffsets
            : isLoadMore
              ? offsets
              : new Map<string, number>();

        console.log(
          "[useUnifiedFeed] Using offsets:",
          Array.from(offsetsToUse.entries()),
        );

        // Fetch from the selected publications in parallel
        const cacheBuster = !isLoadMore ? Date.now() : undefined;
        const results = await Promise.allSettled(
          feedPublicationIds.map(async (pubId) => {
            const offset = offsetsToUse.get(pubId) || 0;
            const result = await fetchArticlesFromPublication(
              pubId,
              offset,
              cacheBuster,
            );
            return {
              publicationId: pubId,
              ...result,
            };
          }),
        );

        const articlesByPub = new Map<string, Article[]>();
        const newOffsets = new Map(offsetsToUse);
        let anyHasMore = false;

        for (const result of results) {
          if (result.status === "fulfilled") {
            const {
              publicationId,
              articles: pubArticles,
              hasMore: pubHasMore,
            } = result.value;
            articlesByPub.set(publicationId, pubArticles);
            newOffsets.set(
              publicationId,
              (offsetsToUse.get(publicationId) || 0) + pubArticles.length,
            );
            if (pubHasMore) {
              anyHasMore = true;
            }
          }
        }

        // Collect all articles to fetch upvote counts
        const allArticlesForCounts: { id: number; publicationId: string }[] =
          [];
        for (const [pubId, arts] of articlesByPub) {
          for (const art of arts) {
            allArticlesForCounts.push({ id: art.id, publicationId: pubId });
          }
        }

        // Fetch upvote counts
        const upvoteCounts = await fetchUpvoteCounts(allArticlesForCounts);

        const newArticles = buildDiverseFeed(articlesByPub, upvoteCounts);

        if (isLoadMore) {
          setArticles((prev) => [...prev, ...newArticles]);
        } else {
          setArticles(newArticles);
        }

        setOffsets(newOffsets);
        // Continue pagination as long as at least one publication has more articles
        // and we successfully built some articles into the feed
        const shouldHaveMore = anyHasMore && newArticles.length > 0;
        setHasMore(shouldHaveMore);
        console.log("[useUnifiedFeed] fetchFeed complete", {
          newArticlesCount: newArticles.length,
          totalArticles: isLoadMore
            ? articles.length + newArticles.length
            : newArticles.length,
          newOffsets: Array.from(newOffsets.entries()),
          anyHasMore,
          shouldHaveMore,
        });
      } catch (err) {
        console.error("Error fetching unified feed:", err);
        setError("Failed to load articles");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      fetchArticlesFromPublication,
      buildDiverseFeed,
      fetchUpvoteCounts,
      offsets,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      feedPublicationIds.join(","),
    ],
  );

  // Initial fetch and refetch when category or publication filter changes
  useEffect(() => {
    setArticles([]);
    setHasMore(true);
    const newOffsets = new Map<string, number>();
    setOffsets(newOffsets);
    fetchFeed(false, newOffsets);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category?.slug, feedPublicationIds.join(",")]);

  const refetch = useCallback(() => {
    const newOffsets = new Map<string, number>();
    setOffsets(newOffsets);
    setArticles([]);
    setHasMore(true);
    fetchFeed(false, newOffsets);
  }, [fetchFeed]);

  const loadMore = useCallback(() => {
    console.log("[useUnifiedFeed] loadMore called", {
      loadingMore,
      hasMore,
      articlesCount: articles.length,
      offsets: Array.from(offsets.entries()),
    });
    if (!loadingMore && hasMore) {
      console.log("[useUnifiedFeed] Calling fetchFeed(true)");
      fetchFeed(true);
    } else {
      console.log("[useUnifiedFeed] Load more blocked:", {
        loadingMore,
        hasMore,
      });
    }
  }, [fetchFeed, loadingMore, hasMore, articles.length, offsets]);

  return {
    articles,
    loading,
    loadingMore,
    error,
    hasMore,
    refetch,
    loadMore,
  };
}
