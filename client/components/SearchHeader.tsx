import React, { useEffect, useRef } from "react";
import { View, TextInput, Pressable, StyleSheet, Keyboard } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  runOnJS,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";

interface SearchHeaderProps {
  isExpanded: boolean;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onToggleExpanded: () => void;
  onSubmit: () => void;
}

const springConfig = {
  damping: 20,
  mass: 0.8,
  stiffness: 200,
};

export function SearchHeader({
  isExpanded,
  searchQuery,
  onSearchQueryChange,
  onToggleExpanded,
  onSubmit,
}: SearchHeaderProps) {
  const { theme, isDark } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const expandProgress = useSharedValue(0);

  useEffect(() => {
    expandProgress.value = withSpring(isExpanded ? 1 : 0, springConfig);
    if (isExpanded) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      Keyboard.dismiss();
    }
  }, [isExpanded]);

  const containerStyle = useAnimatedStyle(() => ({
    flex: interpolate(expandProgress.value, [0, 1], [0, 1]),
    opacity: expandProgress.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expandProgress.value, [0, 0.3], [1, 0]),
    transform: [
      { scale: interpolate(expandProgress.value, [0, 0.3], [1, 0.8]) },
    ],
  }));

  const inputBackgroundColor = isDark
    ? "rgba(255, 255, 255, 0.12)"
    : "rgba(0, 0, 0, 0.06)";
  const placeholderColor = isDark
    ? "rgba(255, 255, 255, 0.4)"
    : "rgba(0, 0, 0, 0.4)";

  const handleCancel = () => {
    onSearchQueryChange("");
    onToggleExpanded();
  };

  const handleSubmit = () => {
    if (searchQuery.trim().length >= 2) {
      onSubmit();
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.searchContainer, containerStyle]}>
        <View
          style={[
            styles.inputWrapper,
            { backgroundColor: inputBackgroundColor },
          ]}
        >
          <Feather
            name="search"
            size={18}
            color={placeholderColor}
            style={styles.inputIcon}
          />
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: theme.text }]}
            placeholder="Search articles..."
            placeholderTextColor={placeholderColor}
            value={searchQuery}
            onChangeText={onSearchQueryChange}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 ? (
            <Pressable onPress={() => onSearchQueryChange("")} hitSlop={8}>
              <Feather name="x-circle" size={18} color={placeholderColor} />
            </Pressable>
          ) : null}
        </View>
        <Pressable onPress={handleCancel} style={styles.cancelButton}>
          <ThemedText style={styles.cancelText}>Cancel</ThemedText>
        </Pressable>
      </Animated.View>

      {!isExpanded ? (
        <Animated.View style={iconStyle}>
          <Pressable
            onPress={onToggleExpanded}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.searchButton}
          >
            <Feather name="search" size={22} color={theme.text} />
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    height: 36,
  },
  inputIcon: {
    marginRight: Spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  cancelButton: {
    marginLeft: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  cancelText: {
    fontSize: 16,
    color: "#007AFF",
  },
  searchButton: {
    padding: Spacing.xs,
  },
});
