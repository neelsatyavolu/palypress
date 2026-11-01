import React from "react";
import { Platform, View, StyleSheet } from "react-native";
import {
  KeyboardStickyView,
  type KeyboardStickyViewProps,
} from "react-native-keyboard-controller";

type Props = KeyboardStickyViewProps & {
  children: React.ReactNode;
};

export function KeyboardStickyViewCompat({ children, ...props }: Props) {
  if (Platform.OS === "web") {
    return <View style={styles.webStickyContainer}>{children}</View>;
  }

  return <KeyboardStickyView {...props}>{children}</KeyboardStickyView>;
}

const styles = StyleSheet.create({
  webStickyContainer: {
    width: "100%",
  },
});
