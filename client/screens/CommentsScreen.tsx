import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useRoute } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyboardStickyViewCompat } from "@/components/KeyboardStickyViewCompat";

import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { usePublication } from "@/contexts/PublicationContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { CommentCard } from "@/components/CommentCard";
import { CommentInput } from "@/components/CommentInput";
import { Comment } from "@/types/article";
import { apiRequest, getApiUrl } from "@/lib/query-client";
import { stripHtmlTags } from "@/lib/htmlUtils";
import { useCommentModeration } from "@/hooks/useCommentModeration";

interface RouteParams {
  articleId: number;
  articleTitle: string;
}

const PER_PAGE = 50;

export default function CommentsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const { isAuthenticated } = useAuth();
  const { publication } = usePublication();
  const route = useRoute();
  const queryClient = useQueryClient();
  const { articleId, articleTitle } = route.params as RouteParams;
  const flatListRef = useRef<FlatList>(null);

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const [editContent, setEditContent] = useState("");

  const { user } = useAuth();
  const { filterComments, reportComment, blockAuthor } = useCommentModeration(
    publication.id,
  );

  const [myCommentIds, setMyCommentIds] = useState<Set<number>>(new Set());

  const editMutation = useMutation({
    mutationFn: async ({
      commentId,
      content,
    }: {
      commentId: number;
      content: string;
    }) => {
      const response = await apiRequest("PATCH", `/api/comments/${commentId}`, {
        content,
        publicationId: publication.id,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments/mine"] });
      setEditingComment(null);
      setEditContent("");
      fetchComments(1, true);
      Alert.alert(
        "Success",
        "Your comment has been updated and is awaiting re-approval.",
      );
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Failed to edit comment");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const response = await apiRequest(
        "DELETE",
        `/api/comments/${commentId}?publication=${publication.id}`,
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments/mine"] });
      fetchComments(1, true);
      Alert.alert("Success", "Comment deleted successfully.");
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Failed to delete comment");
    },
  });

  const fetchComments = async (
    pageNum: number = 1,
    refresh: boolean = false,
  ) => {
    try {
      if (refresh) setRefreshing(true);
      else if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);

      setError(null);

      const cacheBuster = Date.now();
      const apiUrl = getApiUrl();
      const response = await fetch(
        `${apiUrl}/api/comments/article/${articleId}?per_page=${PER_PAGE}&page=${pageNum}&publication=${publication.id}&_=${cacheBuster}`,
        {
          cache: "no-store",
          credentials: "include",
        },
      );

      if (!response.ok) throw new Error("Failed to fetch comments");

      const result = await response.json();
      const data: Comment[] = result.comments || [];
      const totalPages = result.totalPages || 1;

      // Identify user's own comments by matching author_email
      if (user?.email) {
        const userEmail = user.email;
        const ownCommentIds = new Set<number>();
        data.forEach((comment) => {
          if ((comment as any).author_email === userEmail) {
            ownCommentIds.add(comment.id);
          }
        });
        if (refresh || pageNum === 1) {
          setMyCommentIds(ownCommentIds);
        } else {
          setMyCommentIds((prev) => {
            const combined = new Set(prev);
            ownCommentIds.forEach((id) => combined.add(id));
            return combined;
          });
        }
      }

      if (refresh || pageNum === 1) {
        setComments(data);
      } else {
        setComments((prev) => [...prev, ...data]);
      }

      setHasMore(pageNum < totalPages);
      setPage(pageNum);
    } catch (err) {
      console.error("Error fetching comments:", err);
      setError("Failed to load comments");
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchComments(1);
  }, [articleId]);

  const handleRefresh = useCallback(() => {
    fetchComments(1, true);
  }, [articleId]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      fetchComments(page + 1);
    }
  };

  const handleReplyPress = (comment: Comment) => {
    setReplyingTo(comment);
  };

  const handleEditPress = (comment: Comment) => {
    const rawContent = stripHtmlTags(comment.content.rendered).replace(
      /\n\n\(Edited\)$/,
      "",
    );
    setEditContent(rawContent);
    setEditingComment(comment);
  };

  const handleSaveEdit = () => {
    if (!editingComment || !editContent.trim()) return;
    editMutation.mutate({
      commentId: editingComment.id,
      content: editContent.trim(),
    });
  };

  const handleDeletePress = (comment: Comment) => {
    Alert.alert(
      "Delete Comment",
      "Are you sure you want to delete this comment? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMutation.mutate(comment.id),
        },
      ],
    );
  };

  const handleCommentPosted = () => {
    setReplyingTo(null);
    fetchComments(1, true);
  };

  const visibleComments = filterComments(comments);
  const topLevelComments = visibleComments.filter((c) => c.parent === 0);
  const getReplies = (commentId: number) =>
    visibleComments.filter((c) => c.parent === commentId);

  const subtleColor = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const borderColor = isDark ? "rgba(255,255,255,0.1)" : "#E0E0E0";
  const inputBackground = isDark
    ? "rgba(255, 255, 255, 0.05)"
    : "rgba(0, 0, 0, 0.02)";

  const checkOwnership = (commentId: number) => myCommentIds.has(commentId);

  const renderComment = ({ item }: { item: Comment }) => {
    const isOwner = myCommentIds.has(item.id);
    return (
      <CommentCard
        comment={item}
        replies={getReplies(item.id)}
        onReplyPress={isAuthenticated ? handleReplyPress : undefined}
        onEditPress={isAuthenticated ? handleEditPress : undefined}
        onDeletePress={isAuthenticated ? handleDeletePress : undefined}
        onReportPress={(item) => reportComment(item, articleId)}
        onBlockPress={(item) => blockAuthor(item, articleId)}
        isOwner={isOwner}
        checkOwnership={isAuthenticated ? checkOwnership : undefined}
      />
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={subtleColor} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <ThemedText style={[styles.emptyText, { color: subtleColor }]}>
          {error || "No comments yet. Be the first to comment!"}
        </ThemedText>
      </View>
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={subtleColor} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={topLevelComments}
        renderItem={renderComment}
        keyExtractor={(item) => item.id.toString()}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.listContent,
          {
            paddingBottom: isAuthenticated
              ? tabBarHeight + Spacing["4xl"]
              : tabBarHeight + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={subtleColor}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: borderColor }]} />
        )}
      />

      {isAuthenticated ? (
        <KeyboardStickyViewCompat offset={{ closed: 0, opened: 0 }}>
          <View
            style={[
              styles.inputContainer,
              {
                paddingBottom: tabBarHeight + Spacing.sm,
                borderTopColor: borderColor,
                backgroundColor: theme.backgroundRoot,
              },
            ]}
          >
            {replyingTo ? (
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
            )}
          </View>
        </KeyboardStickyViewCompat>
      ) : null}

      <Modal
        visible={editingComment !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingComment(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable
            style={styles.modalDismissArea}
            onPress={() => setEditingComment(null)}
          />
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.backgroundRoot },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Edit Comment</ThemedText>
              <Pressable onPress={() => setEditingComment(null)} hitSlop={12}>
                <ThemedText style={{ fontSize: 18 }}>X</ThemedText>
              </Pressable>
            </View>

            <TextInput
              style={[
                styles.editInput,
                {
                  backgroundColor: inputBackground,
                  borderColor,
                  color: theme.text,
                },
              ]}
              value={editContent}
              onChangeText={setEditContent}
              multiline
              placeholder="Edit your comment..."
              placeholderTextColor={subtleColor}
            />

            <ThemedText style={[styles.editNote, { color: subtleColor }]}>
              Edited comments will be marked as &ldquo;Edited&rdquo; and require
              re-approval.
            </ThemedText>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, { borderColor }]}
                onPress={() => setEditingComment(null)}
              >
                <ThemedText>Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={[
                  styles.modalButton,
                  styles.saveModalButton,
                  {
                    backgroundColor: theme.link,
                    opacity:
                      !editContent.trim() || editMutation.isPending ? 0.5 : 1,
                  },
                ]}
                onPress={handleSaveEdit}
                disabled={editMutation.isPending || !editContent.trim()}
              >
                {editMutation.isPending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={{ color: "#fff", fontWeight: "600" }}>
                    Save
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </View>
          <Pressable
            style={styles.modalDismissArea}
            onPress={() => setEditingComment(null)}
          />
        </KeyboardAvoidingView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  separator: {
    height: 1,
  },
  footerLoader: {
    paddingVertical: Spacing.lg,
    alignItems: "center",
  },
  emptyContainer: {
    paddingVertical: Spacing["2xl"],
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
  },
  inputContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modalDismissArea: {
    flex: 1,
    width: "100%",
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  editInput: {
    minHeight: 120,
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    fontSize: 15,
    textAlignVertical: "top",
  },
  editNote: {
    fontSize: 12,
    marginTop: Spacing.sm,
    fontStyle: "italic",
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  modalButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    minWidth: 80,
    alignItems: "center",
  },
  saveModalButton: {
    borderWidth: 0,
  },
});
