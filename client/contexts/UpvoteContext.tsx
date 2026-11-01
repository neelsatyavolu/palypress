import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";

interface UpvoteContextType {
  upvotedArticles: Map<string, boolean>;
  upvoteCounts: Map<string, number>;
  isLoading: boolean;
  upvoteArticle: (articleId: number, publicationId: string) => Promise<boolean>;
  removeUpvote: (articleId: number, publicationId: string) => Promise<boolean>;
  isArticleUpvoted: (articleId: number, publicationId: string) => boolean;
  getUpvoteCount: (articleId: number, publicationId: string) => number;
  fetchUpvoteCounts: (
    articles: { articleId: number; publicationId: string }[],
  ) => Promise<void>;
  refreshUpvotedArticles: () => Promise<void>;
}

const UpvoteContext = createContext<UpvoteContextType | undefined>(undefined);

function getArticleKey(articleId: number, publicationId: string): string {
  return `${publicationId}-${articleId}`;
}

export function UpvoteProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [upvotedArticles, setUpvotedArticles] = useState<Map<string, boolean>>(
    new Map(),
  );
  const [upvoteCounts, setUpvoteCounts] = useState<Map<string, number>>(
    new Map(),
  );
  const [isLoading, setIsLoading] = useState(false);

  const refreshUpvotedArticles = useCallback(async () => {
    if (!isAuthenticated) {
      setUpvotedArticles(new Map());
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(
        new URL("/api/articles/upvoted/ids", getApiUrl()).toString(),
        {
          credentials: "include",
        },
      );
      if (response.ok) {
        const data = await response.json();
        const newMap = new Map<string, boolean>();
        for (const item of data.upvotedArticles) {
          newMap.set(getArticleKey(item.articleId, item.publicationId), true);
        }
        setUpvotedArticles(newMap);
      }
    } catch (error) {
      console.error("Failed to fetch upvoted articles:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshUpvotedArticles();
  }, [refreshUpvotedArticles]);

  const fetchUpvoteCounts = useCallback(
    async (articles: { articleId: number; publicationId: string }[]) => {
      if (articles.length === 0) return;

      try {
        const response = await apiRequest(
          "POST",
          "/api/articles/upvote-counts",
          { articles },
        );
        if (response.ok) {
          const data = await response.json();
          setUpvoteCounts((prev) => {
            const newMap = new Map(prev);
            for (const [key, count] of Object.entries(data.counts)) {
              newMap.set(key, count as number);
            }
            return newMap;
          });
        }
      } catch (error) {
        console.error("Failed to fetch upvote counts:", error);
      }
    },
    [],
  );

  const upvoteArticle = async (articleId: number, publicationId: string) => {
    const key = getArticleKey(articleId, publicationId);

    // Optimistic update
    setUpvotedArticles((prev) => new Map(prev).set(key, true));
    setUpvoteCounts((prev) => {
      const newMap = new Map(prev);
      newMap.set(key, (newMap.get(key) || 0) + 1);
      return newMap;
    });

    try {
      const response = await apiRequest("POST", "/api/articles/upvote", {
        articleId,
        publicationId,
      });
      if (!response.ok) {
        // Rollback on failure
        setUpvotedArticles((prev) => {
          const newMap = new Map(prev);
          newMap.delete(key);
          return newMap;
        });
        setUpvoteCounts((prev) => {
          const newMap = new Map(prev);
          const currentCount = newMap.get(key) || 1;
          newMap.set(key, Math.max(0, currentCount - 1));
          return newMap;
        });
        return false;
      }
      return true;
    } catch (error) {
      console.error("Failed to upvote article:", error);
      // Rollback on error
      setUpvotedArticles((prev) => {
        const newMap = new Map(prev);
        newMap.delete(key);
        return newMap;
      });
      setUpvoteCounts((prev) => {
        const newMap = new Map(prev);
        const currentCount = newMap.get(key) || 1;
        newMap.set(key, Math.max(0, currentCount - 1));
        return newMap;
      });
      return false;
    }
  };

  const removeUpvote = async (articleId: number, publicationId: string) => {
    const key = getArticleKey(articleId, publicationId);

    // Optimistic update
    const wasUpvoted = upvotedArticles.get(key);
    setUpvotedArticles((prev) => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
    setUpvoteCounts((prev) => {
      const newMap = new Map(prev);
      const currentCount = newMap.get(key) || 1;
      newMap.set(key, Math.max(0, currentCount - 1));
      return newMap;
    });

    try {
      const response = await apiRequest(
        "DELETE",
        `/api/articles/upvote/${articleId}?publicationId=${encodeURIComponent(publicationId)}`,
        undefined,
      );
      if (!response.ok) {
        // Rollback on failure
        if (wasUpvoted) {
          setUpvotedArticles((prev) => new Map(prev).set(key, true));
          setUpvoteCounts((prev) => {
            const newMap = new Map(prev);
            newMap.set(key, (newMap.get(key) || 0) + 1);
            return newMap;
          });
        }
        return false;
      }
      return true;
    } catch (error) {
      console.error("Failed to remove upvote:", error);
      // Rollback on error
      if (wasUpvoted) {
        setUpvotedArticles((prev) => new Map(prev).set(key, true));
        setUpvoteCounts((prev) => {
          const newMap = new Map(prev);
          newMap.set(key, (newMap.get(key) || 0) + 1);
          return newMap;
        });
      }
      return false;
    }
  };

  const isArticleUpvoted = (articleId: number, publicationId: string) => {
    return (
      upvotedArticles.get(getArticleKey(articleId, publicationId)) || false
    );
  };

  const getUpvoteCount = (articleId: number, publicationId: string) => {
    return upvoteCounts.get(getArticleKey(articleId, publicationId)) || 0;
  };

  return (
    <UpvoteContext.Provider
      value={{
        upvotedArticles,
        upvoteCounts,
        isLoading,
        upvoteArticle,
        removeUpvote,
        isArticleUpvoted,
        getUpvoteCount,
        fetchUpvoteCounts,
        refreshUpvotedArticles,
      }}
    >
      {children}
    </UpvoteContext.Provider>
  );
}

export function useUpvotes() {
  const context = useContext(UpvoteContext);
  if (context === undefined) {
    throw new Error("useUpvotes must be used within an UpvoteProvider");
  }
  return context;
}
