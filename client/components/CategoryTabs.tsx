import React, { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Pressable,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Button as TamaguiButton, View as TamaguiView } from "tamagui";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";

export interface Category {
  id: number | null;
  name: string;
  slug: string;
}

// Default "All" category for use when categories are loading
export const DEFAULT_CATEGORY: Category = {
  id: null,
  name: "All",
  slug: "all",
};

// expo-linear-gradient on iOS doesn't reliably parse the "transparent" keyword,
// so the fade's starting stop needs an explicit zero-alpha rgba of the target color.
function transparentVariant(hexColor: string): string {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, 0)`;
}

interface CategoryTabsProps {
  categories: Category[];
  selectedCategory: Category;
  onSelectCategory: (category: Category) => void;
  loading?: boolean;
  centerOnWeb?: boolean;
}

export function CategoryTabs({
  categories,
  selectedCategory,
  onSelectCategory,
  loading,
  centerOnWeb = false,
}: CategoryTabsProps) {
  const { theme, isDark } = useTheme();
  const isWeb = Platform.OS === "web";

  const spinnerColor = isDark ? "#999999" : "#666666";

  const centeredOnWeb = isWeb && centerOnWeb;
  const Container = isWeb ? TamaguiView : View;
  const LoaderContainer = isWeb ? TamaguiView : View;

  const scrollViewRef = useRef<ScrollView>(null);
  const tabLayouts = useRef<Record<string, { x: number; width: number }>>({});
  const [scrollViewWidth, setScrollViewWidth] = useState(0);

  useEffect(() => {
    if (isWeb) return;
    const layout = tabLayouts.current[selectedCategory.slug];
    if (!layout || !scrollViewRef.current) return;
    const target = layout.x - (scrollViewWidth - layout.width) / 2;
    scrollViewRef.current.scrollTo({ x: Math.max(0, target), animated: true });
  }, [selectedCategory.slug, isWeb, scrollViewWidth]);

  return (
    <Container
      style={StyleSheet.flatten([
        styles.container,
        { backgroundColor: theme.backgroundRoot },
      ])}
    >
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        onLayout={(e) => setScrollViewWidth(e.nativeEvent.layout.width)}
        contentContainerStyle={[
          styles.scrollContent,
          centeredOnWeb ? styles.scrollContentCenteredWeb : null,
          isWeb ? { paddingHorizontal: 24, gap: 6 } : styles.scrollContentNative,
        ]}
      >
        {categories.map((category) => {
          const isSelected = selectedCategory.slug === category.slug;

          if (!isWeb) {
            return (
              <Pressable
                key={category.slug}
                onPress={() => onSelectCategory(category)}
                onLayout={(e) => {
                  tabLayouts.current[category.slug] = {
                    x: e.nativeEvent.layout.x,
                    width: e.nativeEvent.layout.width,
                  };
                }}
                style={({ pressed }) => [
                  styles.tab,
                  pressed ? styles.tabPressed : null,
                ]}
              >
                <ThemedText
                  style={[
                    styles.tabText,
                    isSelected
                      ? null
                      : {
                          color: isDark
                            ? "rgba(255, 255, 255, 0.42)"
                            : "rgba(0, 0, 0, 0.42)",
                        },
                  ]}
                >
                  {category.name}
                </ThemedText>
                {isSelected && <View style={styles.tabUnderline} />}
              </Pressable>
            );
          }

          // Web: modern pill tabs
          return (
            <div
              key={category.slug}
              onClick={() => onSelectCategory(category)}
              style={{
                paddingLeft: 18,
                paddingRight: 18,
                paddingTop: 8,
                paddingBottom: 8,
                borderRadius: 20,
                cursor: "pointer",
                userSelect: "none" as any,
                transition: "all 0.15s ease",
                backgroundColor: isSelected
                  ? isDark
                    ? "rgba(10,132,255,0.15)"
                    : "rgba(0,122,255,0.1)"
                  : "transparent",
                border: isSelected
                  ? `1px solid ${isDark ? "rgba(10,132,255,0.25)" : "rgba(0,122,255,0.2)"}`
                  : "1px solid transparent",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  (e.currentTarget as HTMLElement).style.backgroundColor =
                    "transparent";
                }
              }}
            >
              <span
                style={{
                  fontSize: 24,
                  fontWeight: isSelected ? 600 : 500,
                  color: isSelected
                    ? isDark
                      ? "#0A84FF"
                      : "#007AFF"
                    : isDark
                      ? "rgba(255,255,255,0.55)"
                      : "rgba(0,0,0,0.5)",
                  transition: "color 0.15s ease",
                  whiteSpace: "nowrap" as any,
                }}
              >
                {category.name}
              </span>
            </div>
          );
        })}
        {loading && (
          <LoaderContainer style={styles.loaderContainer}>
            <ActivityIndicator size="small" color={spinnerColor} />
          </LoaderContainer>
        )}
      </ScrollView>
      {!isWeb && (
        <LinearGradient
          pointerEvents="none"
          colors={[transparentVariant(theme.backgroundRoot), theme.backgroundRoot]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.edgeFade}
        />
      )}
    </Container>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: Spacing.sm,
  },
  scrollView: {
    backgroundColor: "transparent",
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    alignItems: "center",
  },
  scrollContentCenteredWeb: {
    width: "100%",
    justifyContent: "center",
  },
  scrollContentNative: {
    gap: 22,
  },
  tab: {
    paddingTop: Spacing.sm,
    paddingHorizontal: 2,
    paddingBottom: Spacing.md,
  },
  tabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  tabText: {
    fontSize: 15,
    fontWeight: "600",
  },
  tabUnderline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    borderRadius: 3,
    backgroundColor: "#0A84FF",
  },
  edgeFade: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: 40,
  },
  loaderContainer: {
    paddingHorizontal: Spacing.md,
    justifyContent: "center",
  },
});
