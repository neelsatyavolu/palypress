import React, { ReactNode } from "react";
import {
  Platform,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Pressable,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";
import { Button as TamaguiButton } from "tamagui";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius, Spacing } from "@/constants/theme";

interface ButtonProps {
  onPress?: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  onPress,
  children,
  style,
  disabled = false,
}: ButtonProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.98, springConfig);
    }
  };

  const handlePressOut = () => {
    if (!disabled) {
      scale.value = withSpring(1, springConfig);
    }
  };

  if (Platform.OS !== "web") {
    return (
      <AnimatedPressable
        onPress={disabled ? undefined : onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[
          styles.button,
          {
            backgroundColor: theme.link,
            opacity: disabled ? 0.5 : 1,
          },
          style,
          animatedStyle,
        ]}
      >
        <ThemedText
          type="body"
          style={[styles.buttonText, { color: theme.buttonText }]}
        >
          {children}
        </ThemedText>
      </AnimatedPressable>
    );
  }

  return (
    <TamaguiButton
      unstyled
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={StyleSheet.flatten([
        styles.button,
        {
          backgroundColor: theme.link,
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ])}
      pressStyle={disabled ? undefined : styles.buttonPressed}
    >
      <ThemedText
        type="body"
        style={[styles.buttonText, { color: theme.buttonText }]}
      >
        {children}
      </ThemedText>
    </TamaguiButton>
  );
}

const styles = StyleSheet.create({
  button: {
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontWeight: "600",
  },
  buttonPressed: {
    transform: [{ scale: 0.98 }],
  },
});
