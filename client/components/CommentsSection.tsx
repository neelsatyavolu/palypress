import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { usePublication } from "@/contexts/PublicationContext";
import { Publication } from "@/constants/publications";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { CommentCard } from "@/components/CommentCard";
import { CommentInput } from "@/components/CommentInput";
import { Comment, HomeStackParamList } from "@/types/article";
import { trackCommentSubmitted } from "@/lib/analytics";
import { getApiUrl } from "@/lib/query-client";
import { useCommentModeration } from "@/hooks/useCommentModeration";

interface CommentsSectionProps {
  articleId: number;
  articleTitle: string;
  publication?: Publication;
}

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

const PREVIEW_COUNT = 3;

export function CommentsSection({
  articleId,
  articleTitle,
  publication: propPublication,
}: CommentsSectionProps) {
  const { theme, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const { publication: contextPublication } = usePublication();
  const navigation = useNavigation<NavigationProp>();

  // Use the prop publication if provided, otherwise use context publication
  const publication = propPublication || contextPublication;

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const { filterComments, reportComment, blockAuthor } = useCommentModeration(
    publication.id,
  );

  useEffect(() => {
    fetchComments();
  }, [articleId, publication.id]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      setError(null);
      const cacheBuster = Date.now();
      const response = await fetch(
        `${getApiUrl()}api/comments/article/${articleId}?per_page=100&page=1&publication=${publication.id}&_=${cacheBuster}`,
        { cache: "no-store", credentials: "include" },
      );
      if (!response.ok) throw new Error("Failed to fetch comments");
      const result = await response.json();
      const data: Comment[] = result.comments || [];
      setComments(data);
    } catch (err) {
      console.error("Error fetching comments:", err);
      setError("Failed to load comments");
    } finally {
      setLoading(false);
    }
  };

  const handleViewAllComments = () => {
    if (!isAuthenticated) {
      setShowSignInModal(true);
      return;
    }
    navigation.push("Comments", { articleId, articleTitle });
  };

  const handleSignIn = () => {
    setShowSignInModal(false);
    navigation.dispatch(CommonActions.navigate({ name: "ProfileTab" }));
  };

  const handleReplyPress = (comment: Comment) => {
    if (!isAuthenticated) {
      setShowSignInModal(true);
      return;
    }
    setReplyingTo(comment);
  };

  const handleCommentPosted = () => {
    trackCommentSubmitted({
      articleId,
      articleTitle,
      isReply: replyingTo !== null,
    });
    setReplyingTo(null);
    fetchComments();
  };

  const visibleComments = filterComments(comments);
  const topLevelComments = visibleComments.filter((c) => c.parent === 0);
  const getReplies = (commentId: number) =>
    visibleComments.filter((c) => c.parent === commentId);

  const previewComments = topLevelComments.slice(0, PREVIEW_COUNT);
  const hasMoreComments = topLevelComments.length > PREVIEW_COUNT;
  const totalCount = visibleComments.length;

  const borderColor = isDark ? "rgba(255,255,255,0.1)" : "#E0E0E0";
  const subtleColor = isDark ? "rgba(255,255,255,0.5)" : "#888";

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={[styles.divider, { backgroundColor: borderColor }]} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={subtleColor} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.divider, { backgroundColor: borderColor }]} />

      <View style={styles.header}>
        <ThemedText style={styles.title}>
          Comments {totalCount > 0 ? `(${totalCount})` : ""}
        </ThemedText>
      </View>

      {error ? (
        <ThemedText style={[styles.errorText, { color: subtleColor }]}>
          {error}
        </ThemedText>
      ) : totalCount === 0 ? (
        <ThemedText style={[styles.emptyText, { color: subtleColor }]}>
          No comments yet. Be the first to comment!
        </ThemedText>
      ) : (
        <>
          {previewComments.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              replies={getReplies(comment.id)}
              onReplyPress={isAuthenticated ? handleReplyPress : undefined}
              onReportPress={(item) => reportComment(item, articleId)}
              onBlockPress={(item) => blockAuthor(item, articleId)}
            />
          ))}

          {hasMoreComments ? (
            <Pressable
              style={[styles.viewAllButton, { borderColor }]}
              onPress={handleViewAllComments}
            >
              <ThemedText style={[styles.viewAllText, { color: theme.link }]}>
                View all {topLevelComments.length} comments
              </ThemedText>
              <Feather name="chevron-right" size={18} color={theme.link} />
            </Pressable>
          ) : null}
        </>
      )}

      {isAuthenticated ? (
        replyingTo ? (
          <CommentInput
            articleId={articleId}
            parentId={replyingTo.id}
            parentAuthorName={replyingTo.author_name}
            onCommentPosted={handleCommentPosted}
            onCancel={() => setReplyingTo(null)}
          />
        ) : (
          <CommentInput
            articleId={articleId}
            onCommentPosted={handleCommentPosted}
          />
        )
      ) : (
        <Pressable
          style={[
            styles.signInPrompt,
            { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F5F5F5" },
          ]}
          onPress={() => setShowSignInModal(true)}
        >
          <Feather name="message-circle" size={18} color={theme.link} />
          <ThemedText style={[styles.signInPromptText, { color: theme.link }]}>
            Sign in to comment
          </ThemedText>
        </Pressable>
      )}

      <Modal
        visible={showSignInModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignInModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: isDark ? "#2a2a2a" : "#fff" },
            ]}
          >
            <View style={styles.modalHeader}>
              <Feather name="message-circle" size={32} color={theme.link} />
              <ThemedText style={styles.modalTitle}>
                Sign In Required
              </ThemedText>
            </View>
            <ThemedText
              style={[
                styles.modalText,
                { color: isDark ? "rgba(255,255,255,0.7)" : "#666" },
              ]}
            >
              You need to sign in to view and post comments.
            </ThemedText>
            <View style={styles.modalButtons}>
              <Pressable
                style={[
                  styles.modalButton,
                  styles.modalCancelButton,
                  { borderColor: isDark ? "rgba(255,255,255,0.2)" : "#ddd" },
                ]}
                onPress={() => setShowSignInModal(false)}
              >
                <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.modalButton,
                  styles.modalSignInButton,
                  { backgroundColor: theme.link },
                ]}
                onPress={handleSignIn}
              >
                <ThemedText style={[styles.modalButtonText, { color: "#fff" }]}>
                  Sign In
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.lg,
  },
  divider: {
    height: 1,
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  loadingContainer: {
    paddingVertical: Spacing.xl,
    alignItems: "center",
  },
  errorText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: Spacing.lg,
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: Spacing.lg,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
  },
  viewAllText: {
    fontSize: 15,
    fontWeight: "500",
    marginRight: Spacing.xs,
  },
  signInPrompt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  signInPromptText: {
    fontSize: 15,
    fontWeight: "500",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalContent: {
    width: "100%",
    maxWidth: 320,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: "center",
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: Spacing.sm,
  },
  modalText: {
    fontSize: 15,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  modalButtons: {
    flexDirection: "row",
    width: "100%",
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  modalCancelButton: {
    borderWidth: 1,
  },
  modalSignInButton: {},
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
