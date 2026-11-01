import React from "react";
import { View, StyleSheet } from "react-native";

import { PublicationSwitcher } from "@/components/PublicationSwitcher";

interface HeaderTitleProps {
  title?: string; // Optional now, we use the publication name
}

export function HeaderTitle({ title }: HeaderTitleProps) {
  return (
    <View style={styles.container}>
      <PublicationSwitcher showLabel={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
});
