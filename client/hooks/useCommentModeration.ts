import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl } from "@/lib/query-client";
import { stripHtmlTags } from "@/lib/htmlUtils";
import {
  addLocalBlockedKey,
  addLocalReportedCommentId,
  commentAuthorKey,
  getLocalBlockedKeys,
  getLocalReportedCommentIds,
} from "@/lib/moderation";
import type { Comment } from "@/types/article";

export function useCommentModeration(publicationId: string) {
  const { isAuthenticated } = useAuth();
  const [blockedKeys, setBlockedKeys] = useState<Set<string>>(new Set());
  const [reportedIds, setReportedIds] = useState<Set<number>>(new Set());

  const refresh = useCallback(async () => {
    const [localKeys, localReported] = await Promise.all([
      getLocalBlockedKeys(),
      getLocalReportedCommentIds(),
    ]);
    const keys = new Set(localKeys);
    if (isAuthenticated) {
      try {
        const response = await fetch(
          new URL("/api/moderation/blocks", getApiUrl()),
          { credentials: "include" },
        );
        if (response.ok) {
          const data = await response.json();
          for (const block of data.blocks || []) {
            if (typeof block.blockedAuthorKey === "string") {
              keys.add(block.blockedAuthorKey);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load blocked users:", error);
      }
    }
    setBlockedKeys(keys);
    setReportedIds(new Set(localReported));
  }, [isAuthenticated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isHidden = useCallback(
    (comment: Comment) => {
      if (reportedIds.has(comment.id)) return true;
      return blockedKeys.has(
        commentAuthorKey(publicationId, comment.author, comment.author_name),
      );
    },
    [blockedKeys, publicationId, reportedIds],
  );

  const filterComments = useCallback(
    (comments: Comment[]) => {
      const hiddenIds = new Set(
        comments.filter(isHidden).map((comment) => comment.id),
      );
      return comments.filter(
        (comment) =>
          !hiddenIds.has(comment.id) && !hiddenIds.has(comment.parent),
      );
    },
    [isHidden],
  );

  const reportComment = useCallback(
    (comment: Comment, articleId: number) => {
      const excerpt = stripHtmlTags(comment.content.rendered).slice(0, 500);
      const submit = async (reason: string) => {
        try {
          await fetch(new URL("/api/moderation/report", getApiUrl()), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              publicationId,
              articleId,
              commentId: comment.id,
              commentAuthorId: comment.author || 0,
              commentAuthorName: comment.author_name || "Anonymous",
              commentExcerpt: excerpt || "(empty comment)",
              reason,
            }),
          });
        } catch (error) {
          console.error("Failed to submit report:", error);
        }
        await addLocalReportedCommentId(comment.id);
        setReportedIds((prev) => new Set(prev).add(comment.id));
        Alert.alert(
          "Report sent",
          "Thanks. We'll review this within 24 hours and remove it if it breaks the rules.",
        );
      };

      Alert.alert(
        "Report comment",
        "This flags the comment for review. We remove violating content and can suspend the account within 24 hours.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Harassment", onPress: () => submit("harassment") },
          { text: "Spam", onPress: () => submit("spam") },
          { text: "Other", onPress: () => submit("other") },
        ],
      );
    },
    [publicationId],
  );

  const blockAuthor = useCallback(
    (comment: Comment, articleId: number) => {
      const name = comment.author_name || "this user";
      Alert.alert(
        `Block ${name}?`,
        "Their comments disappear from your feed immediately. We'll also be notified so we can review the content within 24 hours.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Block",
            style: "destructive",
            onPress: async () => {
              const key = commentAuthorKey(
                publicationId,
                comment.author,
                comment.author_name,
              );
              const excerpt = stripHtmlTags(comment.content.rendered).slice(
                0,
                500,
              );
              try {
                await fetch(new URL("/api/moderation/block", getApiUrl()), {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    publicationId,
                    commentAuthorId: comment.author || 0,
                    commentAuthorName: comment.author_name || "Anonymous",
                    sourceCommentId: comment.id,
                    sourceArticleId: articleId,
                    sourceExcerpt: excerpt || "(empty comment)",
                  }),
                });
              } catch (error) {
                console.error("Failed to save block:", error);
              }
              await addLocalBlockedKey(key);
              setBlockedKeys((prev) => new Set(prev).add(key));
            },
          },
        ],
      );
    },
    [publicationId],
  );

  return {
    filterComments,
    reportComment,
    blockAuthor,
    blockedKeys,
    refresh,
  };
}
