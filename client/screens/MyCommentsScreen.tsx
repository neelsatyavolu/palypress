import React, { useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl, apiRequest } from "@/lib/query-client";
import { stripHtmlTags, formatDate } from "@/lib/htmlUtils";
import type { Comment } from "@/types/article";

interface MyComment extends Comment {
  post_title?: string;
}

export default function MyCommentsScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const queryClient = useQueryClient();

  const [editingComment, setEditingComment] = useState<MyComment | null>(null);
  const [editContent, setEditContent] = useState("");

  const cardBackground = isDark
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.03)";
  const borderColor = isDark
    ? "rgba(255, 255, 255, 0.1)"
    : "rgba(0, 0, 0, 0.08)";
  const subtleColor = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const inputBackground = isDark
    ? "rgba(255, 255, 255, 0.05)"
    : "rgba(0, 0, 0, 0.02)";

  const { data, isLoading, error, refetch, isRefetching } = useQuery<{
    comments: MyComment[];
  }>({
    queryKey: ["/api/comments/mine"],
  });

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
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments/mine"] });
      setEditingComment(null);
      setEditContent("");
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
      const response = await apiRequest("DELETE", `/api/comments/${commentId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/comments/mine"] });
      Alert.alert("Success", "Comment deleted successfully.");
    },
    onError: (error: Error) => {
      Alert.alert("Error", error.message || "Failed to delete comment");
    },
  });

  const handleEdit = (comment: MyComment) => {
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

  const handleDelete = (comment: MyComment) => {
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return { text: "Approved", color: "#28a745" };
      case "hold":
        return { text: "Pending", color: "#ffc107" };
      case "spam":
        return { text: "Spam", color: "#dc3545" };
      case "trash":
        return { text: "Deleted", color: "#6c757d" };
      default:
        return { text: status, color: subtleColor };
    }
  };

  const renderComment = ({ item }: { item: MyComment }) => {
    const content = stripHtmlTags(item.content.rendered);
    const date = formatDate(item.date);
    const statusBadge = getStatusBadge(item.status);

    return (
      <View
        style={[
          styles.commentCard,
          { backgroundColor: cardBackground, borderColor },
        ]}
      >
        <View style={styles.commentHeader}>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: statusBadge.color + "20" },
            ]}
          >
            <ThemedText
              style={[styles.statusText, { color: statusBadge.color }]}
            >
              {statusBadge.text}
            </ThemedText>
          </View>
          <ThemedText style={[styles.dateText, { color: subtleColor }]}>
            {date}
          </ThemedText>
        </View>

        <ThemedText style={styles.contentText} numberOfLines={3}>
          {content}
        </ThemedText>

        <View style={styles.actions}>
          <Pressable
            style={[styles.actionButton, { borderColor }]}
            onPress={() => handleEdit(item)}
          >
            <Feather name="edit-2" size={14} color={theme.link} />
            <ThemedText style={[styles.actionText, { color: theme.link }]}>
              Edit
            </ThemedText>
          </Pressable>

          <Pressable
            style={[styles.actionButton, { borderColor: "#dc3545" }]}
            onPress={() => handleDelete(item)}
          >
            <Feather name="trash-2" size={14} color="#dc3545" />
            <ThemedText style={[styles.actionText, { color: "#dc3545" }]}>
              Delete
            </ThemedText>
          </Pressable>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <View
          style={[styles.centered, { paddingTop: headerHeight + Spacing.xl }]}
        >
          <ActivityIndicator size="large" color={theme.link} />
        </View>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <View
          style={[styles.centered, { paddingTop: headerHeight + Spacing.xl }]}
        >
          <Feather name="alert-circle" size={48} color={subtleColor} />
          <ThemedText style={[styles.emptyText, { color: subtleColor }]}>
            Failed to load comments
          </ThemedText>
          <Pressable
            style={[styles.retryButton, { backgroundColor: theme.link }]}
            onPress={() => refetch()}
          >
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  const comments = data?.comments || [];

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={comments}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderComment}
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing["2xl"],
          paddingHorizontal: Spacing.lg,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={theme.text}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="message-circle" size={48} color={subtleColor} />
            <ThemedText style={[styles.emptyText, { color: subtleColor }]}>
              You haven&apos;t posted any comments yet
            </ThemedText>
          </View>
        }
      />

      <Modal
        visible={editingComment !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingComment(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.backgroundRoot },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Edit Comment</ThemedText>
              <Pressable onPress={() => setEditingComment(null)}>
                <Feather name="x" size={24} color={theme.text} />
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
                  { backgroundColor: theme.link },
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
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: Spacing["4xl"],
  },
  emptyText: {
    fontSize: 16,
    marginTop: Spacing.md,
    textAlign: "center",
  },
  retryButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  retryText: {
    color: "#fff",
    fontWeight: "600",
  },
  commentCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  dateText: {
    fontSize: 12,
  },
  contentText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    borderWidth: 1,
  },
  actionText: {
    fontSize: 13,
    fontWeight: "500",
    marginLeft: 4,
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
