import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Slider from "@react-native-community/slider";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "@/hooks/useTheme";
import {
  useReaderPreferences,
  type AppFontFamily,
  type FontFamily,
  type LineSpacing,
} from "@/contexts/ReaderPreferencesContext";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { BorderRadius, Fonts, Spacing } from "@/constants/theme";
import type { ThemeMode } from "@/lib/themeMode";

type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

const themeModeOptions: {
  value: ThemeMode;
  label: string;
  icon: FeatherIconName;
}[] = [
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "system", label: "System", icon: "monitor" },
];

const appFontOptions: {
  value: AppFontFamily;
  label: string;
  icon: FeatherIconName;
}[] = [
  { value: "system", label: "System", icon: "smartphone" },
  { value: "rounded", label: "Rounded", icon: "circle" },
];

const readerFontOptions: {
  value: FontFamily;
  label: string;
  icon: FeatherIconName;
}[] = [
  { value: "sans", label: "Sans", icon: "align-left" },
  { value: "serif", label: "Serif", icon: "type" },
];

const lineSpacingOptions: {
  value: LineSpacing;
  label: string;
  icon: FeatherIconName;
}[] = [
  { value: "compact", label: "Compact", icon: "minimize-2" },
  { value: "comfortable", label: "Comfort", icon: "align-justify" },
  { value: "spacious", label: "Spacious", icon: "maximize-2" },
];

export default function AppearanceSettingsScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = useHeaderHeight();
  const { theme, isDark, mode, setMode } = useTheme();
  const {
    preferences,
    setFontSize,
    setFontFamily,
    setLineSpacing,
    setAppFontFamily,
    resetPreferences,
  } = useReaderPreferences();

  const cardBackgroundColor = isDark
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.03)";
  const borderColor = isDark
    ? "rgba(255, 255, 255, 0.1)"
    : "rgba(0, 0, 0, 0.08)";
  const secondaryTextColor = isDark ? "rgba(255, 255, 255, 0.6)" : "#666";
  const controlBackgroundColor = isDark
    ? "rgba(255, 255, 255, 0.05)"
    : "rgba(0, 0, 0, 0.04)";

  const renderSegmentedControl = <T extends string>({
    options,
    value,
    onChange,
    itemStyle,
  }: {
    options: { value: T; label: string; icon: FeatherIconName }[];
    value: T;
    onChange: (value: T) => void;
    itemStyle?: StyleProp<ViewStyle>;
  }) => (
    <View
      style={[
        styles.segmentedControl,
        { backgroundColor: controlBackgroundColor, borderColor },
      ]}
    >
      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            style={[
              styles.segmentedOption,
              itemStyle,
              isSelected
                ? { backgroundColor: theme.link }
                : { backgroundColor: "transparent" },
            ]}
            onPress={() => onChange(option.value)}
          >
            <Feather
              name={option.icon}
              size={16}
              color={isSelected ? "#fff" : secondaryTextColor}
            />
            <ThemedText
              style={[
                styles.segmentedLabel,
                { color: isSelected ? "#fff" : theme.text },
              ]}
            >
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: cardBackgroundColor, borderColor },
          ]}
        >
          <View style={styles.cardHeader}>
            <Feather name="smartphone" size={20} color={theme.text} />
            <ThemedText style={styles.cardTitle}>App</ThemedText>
          </View>

          <View style={styles.settingGroup}>
            <ThemedText style={styles.settingLabel}>Mode</ThemedText>
            {renderSegmentedControl({
              options: themeModeOptions,
              value: mode,
              onChange: setMode,
            })}
          </View>

          <View style={styles.settingGroup}>
            <ThemedText style={styles.settingLabel}>App Font</ThemedText>
            {renderSegmentedControl({
              options: appFontOptions,
              value: preferences.appFontFamily,
              onChange: setAppFontFamily,
            })}
          </View>
        </View>

        <View
          style={[
            styles.card,
            { backgroundColor: cardBackgroundColor, borderColor },
          ]}
        >
          <View style={styles.cardHeader}>
            <Feather name="book-open" size={20} color={theme.text} />
            <ThemedText style={styles.cardTitle}>Reader</ThemedText>
          </View>

          <View style={styles.settingGroup}>
            <ThemedText style={styles.settingLabel}>Reader Font</ThemedText>
            {renderSegmentedControl({
              options: readerFontOptions,
              value: preferences.fontFamily,
              onChange: setFontFamily,
            })}
          </View>

          <View style={styles.settingGroup}>
            <View style={styles.settingHeader}>
              <ThemedText style={styles.settingLabel}>Font Size</ThemedText>
              <ThemedText
                style={[styles.settingValue, { color: secondaryTextColor }]}
              >
                {preferences.fontSize}px
              </ThemedText>
            </View>
            <View style={styles.sliderRow}>
              <ThemedText
                style={[styles.sliderLabel, { color: secondaryTextColor }]}
              >
                A
              </ThemedText>
              <Slider
                style={styles.slider}
                minimumValue={14}
                maximumValue={22}
                step={2}
                value={preferences.fontSize}
                onValueChange={setFontSize}
                minimumTrackTintColor={theme.link}
                maximumTrackTintColor={
                  isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)"
                }
                thumbTintColor={theme.link}
              />
              <ThemedText
                style={[styles.sliderLabelLarge, { color: secondaryTextColor }]}
              >
                A
              </ThemedText>
            </View>
          </View>

          <View style={styles.settingGroup}>
            <ThemedText style={styles.settingLabel}>Line Spacing</ThemedText>
            {renderSegmentedControl({
              options: lineSpacingOptions,
              value: preferences.lineSpacing,
              onChange: setLineSpacing,
              itemStyle: styles.compactSegmentedOption,
            })}
          </View>

          <View
            style={[
              styles.preview,
              {
                backgroundColor: controlBackgroundColor,
                borderColor,
              },
            ]}
          >
            <ThemedText style={styles.previewTitle}>Article Preview</ThemedText>
            <ThemedText
              style={{
                color: secondaryTextColor,
                fontFamily:
                  preferences.fontFamily === "serif" ? Fonts.serif : Fonts.sans,
                fontSize: preferences.fontSize,
                lineHeight:
                  preferences.fontSize *
                  (preferences.lineSpacing === "compact"
                    ? 1.35
                    : preferences.lineSpacing === "spacious"
                      ? 1.85
                      : 1.6),
              }}
            >
              A quick look at how stories will read in the article view.
            </ThemedText>
          </View>

          <Pressable
            accessibilityRole="button"
            style={[styles.resetButton, { borderColor }]}
            onPress={resetPreferences}
          >
            <Feather name="rotate-ccw" size={16} color={secondaryTextColor} />
            <ThemedText
              style={[styles.resetText, { color: secondaryTextColor }]}
            >
              Reset Reader Defaults
            </ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  card: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  settingGroup: {
    gap: Spacing.sm,
  },
  settingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  settingValue: {
    fontSize: 13,
    fontWeight: "500",
  },
  segmentedControl: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: 3,
  },
  segmentedOption: {
    flex: 1,
    minHeight: 40,
    borderRadius: BorderRadius.xs,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
  },
  compactSegmentedOption: {
    paddingHorizontal: Spacing.xs,
  },
  segmentedLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: Spacing.xs,
  },
  sliderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  sliderLabelLarge: {
    fontSize: 20,
    fontWeight: "600",
  },
  slider: {
    flex: 1,
    height: 40,
  },
  preview: {
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  resetButton: {
    minHeight: 44,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
  },
  resetText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
