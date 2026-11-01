import React from "react";
import { Platform, StyleProp, StyleSheet, ViewStyle } from "react-native";
import { View as TamaguiView } from "tamagui";

interface DesktopShellProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  maxWidth?: number | null;
}

export function DesktopShell({
  children,
  style,
  contentStyle,
  maxWidth = 1120,
}: DesktopShellProps) {
  if (Platform.OS !== "web") {
    return <>{children}</>;
  }

  return (
    <TamaguiView style={StyleSheet.flatten([styles.outer, style])}>
      <TamaguiView
        style={StyleSheet.flatten([
          styles.inner,
          maxWidth === null ? null : { maxWidth },
          contentStyle,
        ])}
      >
        {children}
      </TamaguiView>
    </TamaguiView>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: "100%",
    minHeight: "100%",
    alignItems: "center",
  },
  inner: {
    width: "100%",
    minHeight: "100%",
  },
});
