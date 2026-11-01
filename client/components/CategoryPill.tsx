import React from "react";
import { Platform, StyleSheet, Pressable, View } from "react-native";
import { Button as TamaguiButton, View as TamaguiView } from "tamagui";
import { ThemedText } from "@/components/ThemedText";
import { BorderRadius } from "@/constants/theme";

interface CategoryPillProps {
  category: string;
  color: string;
  onPress?: () => void;
  small?: boolean;
}

export function CategoryPill({
  category,
  color,
  onPress,
  small = false,
}: CategoryPillProps) {
  const PillView = Platform.OS === "web" ? TamaguiView : View;

  const content = (
    <PillView
      style={StyleSheet.flatten([
        styles.pill,
        { backgroundColor: color },
        small && styles.pillSmall,
      ])}
    >
      <ThemedText style={[styles.text, small && styles.textSmall]}>
        {category.toUpperCase()}
      </ThemedText>
    </PillView>
  );

  if (onPress) {
    if (Platform.OS !== "web") {
      return (
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
        >
          {content}
        </Pressable>
      );
    }

    return (
      <TamaguiButton unstyled onPress={onPress} pressStyle={styles.pressed}>
        {content}
      </TamaguiButton>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BorderRadius.xs,
    alignSelf: "flex-start",
  },
  pillSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  text: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  textSmall: {
    fontSize: 10,
  },
  pressed: {
    opacity: 0.7,
  },
});
