import React, { useState } from "react";
import { Modal, View, StyleSheet, Pressable, ScrollView } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

export interface ToCSection {
  id: string;
  title: string;
  level: number; // 2 for h2, 3 for h3
}

interface TableOfContentsProps {
  visible: boolean;
  onClose: () => void;
  sections: ToCSection[];
  currentSectionId?: string;
  onSectionPress: (sectionId: string) => void;
}

export function TableOfContents({
  visible,
  onClose,
  sections,
  currentSectionId,
  onSectionPress,
}: TableOfContentsProps) {
  const { theme, isDark } = useTheme();

  const handleSectionPress = (sectionId: string) => {
    onSectionPress(sectionId);
    onClose();
  };

  if (!sections || sections.length === 0) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[
            styles.drawer,
            { backgroundColor: isDark ? "#2a2a2a" : "#fff" },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Feather name="list" size={24} color={theme.text} />
              <ThemedText style={styles.title}>Table of Contents</ThemedText>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
          >
            {sections.map((section, index) => {
              const isActive = section.id === currentSectionId;
              const isH3 = section.level === 3;

              return (
                <Pressable
                  key={section.id || index}
                  style={[
                    styles.sectionItem,
                    isH3 && styles.sectionItemIndented,
                    isActive && {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.05)",
                    },
                  ]}
                  onPress={() => handleSectionPress(section.id)}
                >
                  {isActive && (
                    <View
                      style={[
                        styles.activeIndicator,
                        { backgroundColor: theme.link },
                      ]}
                    />
                  )}
                  <ThemedText
                    style={[
                      styles.sectionText,
                      isH3 && styles.sectionTextSmall,
                      isActive && {
                        color: theme.link,
                        fontWeight: "600",
                      },
                    ]}
                    numberOfLines={2}
                  >
                    {section.title}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-start",
  },
  drawer: {
    width: "80%",
    maxWidth: 320,
    height: "100%",
    borderTopRightRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
    paddingVertical: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  sectionItem: {
    position: "relative",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.xs,
  },
  sectionItemIndented: {
    paddingLeft: Spacing.xl,
  },
  activeIndicator: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 22,
  },
  sectionTextSmall: {
    fontSize: 14,
    lineHeight: 20,
  },
});
