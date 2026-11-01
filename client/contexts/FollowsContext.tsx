import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { getApiUrl } from "@/lib/query-client";
import { useAuth } from "@/contexts/AuthContext";

export function isFollowingHelper(set: Set<string>, id: string): boolean {
  return set.has(id);
}

interface FollowsContextType {
  followedPublicationIds: Set<string>;
  isLoading: boolean;
  isFollowing: (publicationId: string) => boolean;
  followPublication: (publicationId: string) => Promise<boolean>;
  unfollowPublication: (publicationId: string) => Promise<boolean>;
  refreshFollows: () => Promise<void>;
}

const FollowsContext = createContext<FollowsContextType | undefined>(
  undefined,
);

export function FollowsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [followedPublicationIds, setFollowedPublicationIds] = useState<
    Set<string>
  >(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const refreshFollows = useCallback(async () => {
    if (!isAuthenticated) {
      setFollowedPublicationIds(new Set());
      return;
    }
    try {
      setIsLoading(true);
      const res = await fetch(
        new URL("/api/follows", getApiUrl()).toString(),
        { credentials: "include" },
      );
      if (res.ok) {
        const data = await res.json();
        setFollowedPublicationIds(new Set<string>(data.publicationIds));
      }
    } catch (e) {
      console.error("Failed to fetch follows:", e);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refreshFollows();
  }, [refreshFollows]);

  const followPublication = async (
    publicationId: string,
  ): Promise<boolean> => {
    try {
      const res = await fetch(
        new URL("/api/follows", getApiUrl()).toString(),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ publicationId }),
        },
      );
      if (!res.ok) return false;
      setFollowedPublicationIds((prev) => new Set(prev).add(publicationId));
      return true;
    } catch (e) {
      console.error("Follow failed:", e);
      return false;
    }
  };

  const unfollowPublication = async (
    publicationId: string,
  ): Promise<boolean> => {
    try {
      const res = await fetch(
        new URL(`/api/follows/${publicationId}`, getApiUrl()).toString(),
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!res.ok) return false;
      setFollowedPublicationIds((prev) => {
        const next = new Set(prev);
        next.delete(publicationId);
        return next;
      });
      return true;
    } catch (e) {
      console.error("Unfollow failed:", e);
      return false;
    }
  };

  const isFollowing = (publicationId: string) =>
    isFollowingHelper(followedPublicationIds, publicationId);

  return (
    <FollowsContext.Provider
      value={{
        followedPublicationIds,
        isLoading,
        isFollowing,
        followPublication,
        unfollowPublication,
        refreshFollows,
      }}
    >
      {children}
    </FollowsContext.Provider>
  );
}

export function useFollows(): FollowsContextType {
  const ctx = useContext(FollowsContext);
  if (!ctx) throw new Error("useFollows must be used within a FollowsProvider");
  return ctx;
}
