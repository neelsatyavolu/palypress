import React from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  interpolate,
  Extrapolate,
  SharedValue,
} from "react-native-reanimated";

interface ArticleProgressBarProps {
  scrollY: SharedValue<number>;
  contentHeight: number;
  color: string;
}

const SCREEN_HEIGHT = Dimensions.get("window").height;

export function ArticleProgressBar({
  scrollY,
  contentHeight,
  color,
}: ArticleProgressBarProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const progressWidth = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    // Calculate reading progress
    // Account for screen height to determine actual scrollable content
    const scrollableHeight = Math.max(0, contentHeight - SCREEN_HEIGHT);
    const progress =
      scrollableHeight > 0
        ? interpolate(
            scrollY.value,
            [0, scrollableHeight],
            [0, 100],
            Extrapolate.CLAMP,
          )
        : 0;

    return {
      width: `${progress}%`,
      backgroundColor: color,
    };
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.progressBar, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "transparent",
    zIndex: 1000,
  },
  progressBar: {
    height: "100%",
  },
});
