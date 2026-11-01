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
import { cacheArticle, removeCachedArticle } from "@/lib/offlineStore";
import type { ArticleWithSource } from "@/types/article";

interface SavedArticlesContextType {
  savedArticleIds: Set<number>;
  isLoading: boolean;
  saveArticle: (article: {
    articleId: number;
    articleTitle: string;
    articleExcerpt?: string;
    articleAuthor?: string;
    articleDate?: string;
    articleImageUrl?: string;
    fullArticle?: ArticleWithSource;
  }) => Promise<boolean>;
  unsaveArticle: (articleId: number) => Promise<boolean>;
  isArticleSaved: (articleId: number) => boolean;
  refreshSavedArticles: () => Promise<void>;
}

const SavedArticlesContext = createContext<
  SavedArticlesContextType | undefined
>(undefined);

export function SavedArticlesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [savedArticleIds, setSavedArticleIds] = useState<Set<number>>(
    new Set(),
  );
  const [isLoading, setIsLoading] = useState(false);

  const refreshSavedArticles = useCallback(async () => {
    if (!isAuthenticated) {
      setSavedArticleIds(new Set());
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(
        new URL("/api/articles/saved/ids", getApiUrl()).toString(),
        {
          credentials: "include",
        },
      );
      if (response.ok) {
        const data = await response.json();
        setSavedArticleIds(new Set(data.articleIds));
      }
    } catch (error) {
      console.error("Failed to fetch saved articles:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshSavedArticles();
  }, [refreshSavedArticles]);

  const saveArticle = async (article: {
    articleId: number;
    articleTitle: string;
    articleExcerpt?: string;
    articleAuthor?: string;
    articleDate?: string;
    articleImageUrl?: string;
    fullArticle?: ArticleWithSource;
  }) => {
    try {
      const { fullArticle, ...metadata } = article;
      const response = await apiRequest("POST", "/api/articles/save", metadata);
      if (response.ok) {
        setSavedArticleIds((prev) => new Set([...prev, article.articleId]));
        if (fullArticle) {
          try {
            await cacheArticle(fullArticle, "saved");
          } catch (error) {
            console.error(
              "Failed to cache article for offline reading:",
              error,
            );
          }
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to save article:", error);
      return false;
    }
  };

  const unsaveArticle = async (articleId: number) => {
    try {
      const response = await apiRequest(
        "DELETE",
        `/api/articles/save/${articleId}`,
        undefined,
      );
      if (response.ok) {
        setSavedArticleIds((prev) => {
          const next = new Set(prev);
          next.delete(articleId);
          return next;
        });
        try {
          await removeCachedArticle(articleId);
        } catch (error) {
          console.error("Failed to remove cached article:", error);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error("Failed to unsave article:", error);
      return false;
    }
  };

  const isArticleSaved = (articleId: number) => savedArticleIds.has(articleId);

  return (
    <SavedArticlesContext.Provider
      value={{
        savedArticleIds,
        isLoading,
        saveArticle,
        unsaveArticle,
        isArticleSaved,
        refreshSavedArticles,
      }}
    >
      {children}
    </SavedArticlesContext.Provider>
  );
}

export function useSavedArticles() {
  const context = useContext(SavedArticlesContext);
  if (context === undefined) {
    throw new Error(
      "useSavedArticles must be used within a SavedArticlesProvider",
    );
  }
  return context;
}
