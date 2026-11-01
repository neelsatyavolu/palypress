import { useMemo } from "react";
import { useUnifiedFeed } from "./useUnifiedFeed";
import { isCivicArticle } from "@/constants/civic";

export function useCivicFeed() {
  const feed = useUnifiedFeed();
  const articles = useMemo(() => {
    // Filter to civic articles and de-duplicate by the same composite key the
    // list uses (`${publicationId}-${id}`). WordPress ids are only unique per
    // publication, and the unified feed can re-surface an article across
    // pagination, so without this the list can render duplicate React keys.
    const seen = new Set<string>();
    return feed.articles.filter((article) => {
      if (!isCivicArticle(article)) return false;
      const key = `${article.publicationId}-${article.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [feed.articles]);
  return { ...feed, articles };
}
