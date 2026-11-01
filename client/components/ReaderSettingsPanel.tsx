import React from "react";
import { View, StyleSheet, Modal, Pressable, ScrollView } from "react-native";
import Slider from "@react-native-community/slider";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import {
  useReaderPreferences,
  FontFamily,
  LineSpacing,
} from "@/contexts/ReaderPreferencesContext";
import { Spacing, BorderRadius } from "@/constants/theme";

interface ReaderSettingsPanelProps {
  visible: boolean;
  onClose: () => void;
}

export function ReaderSettingsPanel({
  visible,
  onClose,
}: ReaderSettingsPanelProps) {
  const { theme, isDark } = useTheme();
  const {
    preferences,
    setFontSize,
    setFontFamily,
    setLineSpacing,
    resetPreferences,
  } = useReaderPreferences();

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
            styles.panel,
            { backgroundColor: isDark ? "#2a2a2a" : "#fff" },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <Feather name="type" size={24} color={theme.text} />
                <ThemedText style={styles.title}>Reader Settings</ThemedText>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            {/* Font Size */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <ThemedText style={styles.sectionTitle}>Font Size</ThemedText>
                <ThemedText style={styles.sectionValue}>
                  {preferences.fontSize}px
                </ThemedText>
              </View>
              <View style={styles.sliderRow}>
                <ThemedText style={styles.sliderLabel}>A</ThemedText>
                <Slider
                  style={styles.slider}
                  minimumValue={14}
                  maximumValue={22}
                  step={2}
                  value={preferences.fontSize}
                  onValueChange={setFontSize}
                  minimumTrackTintColor={theme.link}
                  maximumTrackTintColor={
                    isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
                  }
                  thumbTintColor={theme.link}
                />
                <ThemedText style={styles.sliderLabel}>A</ThemedText>
              </View>
            </View>

            {/* Font Family */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Font Family</ThemedText>
              <View style={styles.optionsRow}>
                <Pressable
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor:
                        preferences.fontFamily === "sans"
                          ? theme.link
                          : isDark
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(0,0,0,0.05)",
                    },
                  ]}
                  onPress={() => setFontFamily("sans")}
                >
                  <ThemedText
                    style={[
                      styles.optionText,
                      {
                        color:
                          preferences.fontFamily === "sans"
                            ? "#fff"
                            : theme.text,
                      },
                    ]}
                  >
                    Sans-Serif
                  </ThemedText>
                </Pressable>
                <Pressable
                  style={[
                    styles.optionButton,
                    {
                      backgroundColor:
                        preferences.fontFamily === "serif"
                          ? theme.link
                          : isDark
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(0,0,0,0.05)",
                    },
                  ]}
                  onPress={() => setFontFamily("serif")}
                >
                  <ThemedText
                    style={[
                      styles.optionText,
                      {
                        color:
                          preferences.fontFamily === "serif"
                            ? "#fff"
                            : theme.text,
                        fontFamily: "serif",
                      },
                    ]}
                  >
                    Serif
                  </ThemedText>
                </Pressable>
              </View>
            </View>

            {/* Line Spacing */}
            <View style={styles.section}>
              <ThemedText style={styles.sectionTitle}>Line Spacing</ThemedText>
              <View style={styles.optionsColumn}>
                {(["compact", "comfortable", "spacious"] as LineSpacing[]).map(
                  (spacing) => (
                    <Pressable
                      key={spacing}
                      style={[
                        styles.optionButtonWide,
                        {
                          backgroundColor:
                            preferences.lineSpacing === spacing
                              ? theme.link
                              : isDark
                                ? "rgba(255,255,255,0.1)"
                                : "rgba(0,0,0,0.05)",
                        },
                      ]}
                      onPress={() => setLineSpacing(spacing)}
                    >
                      <ThemedText
                        style={[
                          styles.optionText,
                          {
                            color:
                              preferences.lineSpacing === spacing
                                ? "#fff"
                                : theme.text,
                          },
                        ]}
                      >
                        {spacing.charAt(0).toUpperCase() + spacing.slice(1)}
                      </ThemedText>
                      {preferences.lineSpacing === spacing && (
                        <Feather name="check" size={18} color="#fff" />
                      )}
                    </Pressable>
                  ),
                )}
              </View>
            </View>

            {/* Reset Button */}
            <Pressable
              style={[
                styles.resetButton,
                {
                  borderColor: isDark
                    ? "rgba(255,255,255,0.2)"
                    : "rgba(0,0,0,0.1)",
                },
              ]}
              onPress={resetPreferences}
            >
              <Feather
                name="rotate-ccw"
                size={16}
                color={theme.textSecondary}
                style={{ marginRight: 8 }}
              />
              <ThemedText style={{ color: theme.textSecondary }}>
                Reset to Default
              </ThemedText>
            </Pressable>
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
    justifyContent: "flex-end",
  },
  panel: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing["3xl"],
    maxHeight: "80%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xl,
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
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  sectionValue: {
    fontSize: 14,
    opacity: 0.7,
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  sliderLabel: {
    fontSize: 16,
    opacity: 0.6,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  optionsRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  optionsColumn: {
    gap: Spacing.sm,
  },
  optionButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  optionButtonWide: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  optionText: {
    fontSize: 15,
    fontWeight: "500",
  },
  resetButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginTop: Spacing.md,
  },
});
