import React, { useState } from "react";
import {
  Modal,
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  StatusBar,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface ImageData {
  uri: string;
  caption?: string;
}

interface ImageLightboxProps {
  images: ImageData[];
  initialIndex?: number;
  visible: boolean;
  onClose: () => void;
}

export function ImageLightbox({
  images,
  initialIndex = 0,
  visible,
  onClose,
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  const currentImage = images[currentIndex];

  const resetTransform = () => {
    "worklet";
    scale.value = withSpring(1);
    savedScale.value = 1;
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  };

  const goToNext = () => {
    if (currentIndex < images.length - 1) {
      resetTransform();
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      resetTransform();
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleClose = () => {
    resetTransform();
    setCurrentIndex(initialIndex);
    onClose();
  };

  // Pinch to zoom gesture
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = savedScale.value * event.scale;
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
      } else if (scale.value > 3) {
        scale.value = withSpring(3);
        savedScale.value = 3;
      } else {
        savedScale.value = scale.value;
      }
    });

  // Pan gesture for zoomed images
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value > 1) {
        translateX.value = event.translationX;
        translateY.value = event.translationY;
      }
    })
    .onEnd(() => {
      if (scale.value <= 1) {
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }
    });

  // Double tap to zoom
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      } else {
        scale.value = withSpring(2);
        savedScale.value = 2;
      }
    });

  const composed = Gesture.Simultaneous(
    doubleTap,
    Gesture.Simultaneous(pinchGesture, panGesture),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.container, animatedContainerStyle]}>
        <StatusBar hidden />

        {/* Close Button */}
        <View style={styles.header}>
          <Pressable
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="x" size={28} color="#fff" />
          </Pressable>

          {images.length > 1 && (
            <View style={styles.counter}>
              <ThemedText style={styles.counterText}>
                {currentIndex + 1} / {images.length}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Image */}
        <GestureDetector gesture={composed}>
          <Animated.View style={[styles.imageContainer, animatedStyle]}>
            <Image
              source={{ uri: currentImage.uri }}
              style={styles.image}
              contentFit="contain"
              transition={200}
            />
          </Animated.View>
        </GestureDetector>

        {/* Caption */}
        {currentImage.caption && (
          <View style={styles.captionContainer}>
            <ThemedText style={styles.caption}>
              {currentImage.caption}
            </ThemedText>
          </View>
        )}

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            {currentIndex > 0 && (
              <Pressable
                style={[styles.navButton, styles.navButtonLeft]}
                onPress={goToPrevious}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Feather name="chevron-left" size={32} color="#fff" />
              </Pressable>
            )}

            {currentIndex < images.length - 1 && (
              <Pressable
                style={[styles.navButton, styles.navButtonRight]}
                onPress={goToNext}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
              >
                <Feather name="chevron-right" size={32} color="#fff" />
              </Pressable>
            )}
          </>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Spacing["5xl"],
    paddingHorizontal: Spacing.lg,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  counter: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  counterText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  captionContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  caption: {
    color: "#fff",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  navButton: {
    position: "absolute",
    top: "50%",
    marginTop: -24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  navButtonLeft: {
    left: Spacing.lg,
  },
  navButtonRight: {
    right: Spacing.lg,
  },
});
