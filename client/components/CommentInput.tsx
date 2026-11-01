import React, { useState } from "react";
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { useTheme } from "@/hooks/useTheme";
import { usePublication } from "@/contexts/PublicationContext";
import { Spacing, BorderRadius } from "@/constants/theme";
import { ThemedText } from "@/components/ThemedText";
import { apiRequest } from "@/lib/query-client";
import { haptics } from "@/lib/haptics";

interface CommentInputProps {
  articleId: number;
  parentId?: number;
  parentAuthorName?: string;
  onCommentPosted: () => void;
  onCancel?: () => void;
  onInputFocus?: () => void;
}

export function CommentInput({
  articleId,
  parentId,
  parentAuthorName,
  onCommentPosted,
  onCancel,
  onInputFocus,
}: CommentInputProps) {
  const { theme, isDark } = useTheme();
  const { publication } = usePublication();

  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const inputBgColor = isDark ? "rgba(255,255,255,0.12)" : "#FFFFFF";
  const placeholderColor = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const borderColor = isDark ? "rgba(255,255,255,0.2)" : "#CCCCCC";

  const handleSubmit = async () => {
    if (!content.trim()) return;

    haptics.medium();
    setSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/comments", {
        postId: articleId,
        content: content.trim(),
        parentId: parentId,
        publicationId: publication.id,
      });

      const result = await response.json();

      haptics.success();
      setContent("");
      setShowSuccess(true);

      setTimeout(() => {
        setShowSuccess(false);
        onCommentPosted();
      }, 2000);
    } catch (error: any) {
      console.error("Failed to post comment:", error);
      haptics.error();
      let errorMessage = "Failed to submit comment. Please try again.";
      if (error.message) {
        try {
          const parsed = JSON.parse(error.message.split(": ")[1] || "{}");
          if (parsed.error) errorMessage = parsed.error;
        } catch {}
      }
      Alert.alert("Error", errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (showSuccess) {
    return (
      <View
        style={[
          styles.successContainer,
          { backgroundColor: inputBgColor, borderColor },
        ]}
      >
        <Feather name="check-circle" size={20} color="#4CAF50" />
        <ThemedText style={styles.successText}>
          Comment submitted! Awaiting moderation.
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderColor }]}>
      {parentAuthorName ? (
        <View style={styles.replyHeader}>
          <ThemedText style={[styles.replyLabel, { color: placeholderColor }]}>
            Replying to {parentAuthorName}
          </ThemedText>
          {onCancel ? (
            <Pressable onPress={onCancel} hitSlop={8}>
              <Feather name="x" size={18} color={placeholderColor} />
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <View>
        <View
          style={[
            styles.inputRow,
            { backgroundColor: inputBgColor, borderColor, borderWidth: 1 },
          ]}
        >
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder={parentId ? "Write a reply..." : "Add a comment..."}
            placeholderTextColor={placeholderColor}
            value={content}
            onChangeText={setContent}
            onFocus={onInputFocus}
            multiline
            maxLength={5000}
            editable={!submitting}
          />

          <Pressable
            style={[
              styles.submitButton,
              { backgroundColor: theme.link },
              (!content.trim() || submitting) && { opacity: 0.5 },
            ]}
            onPress={handleSubmit}
            disabled={!content.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Feather name="send" size={16} color="#fff" />
            )}
          </Pressable>
        </View>

        {/* Character count */}
        {content.length > 0 && (
          <ThemedText
            style={[
              styles.charCount,
              {
                color:
                  content.length > 4500
                    ? content.length >= 5000
                      ? "#EF4444"
                      : "#F59E0B"
                    : placeholderColor,
              },
            ]}
          >
            {content.length}/5000
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.md,
    borderTopWidth: 1,
    paddingTop: Spacing.md,
  },
  replyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  replyLabel: {
    fontSize: 13,
    fontStyle: "italic",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 40,
    maxHeight: 100,
    paddingVertical: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  charCount: {
    fontSize: 12,
    textAlign: "right",
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  submitButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: Spacing.sm,
  },
  successContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  successText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
