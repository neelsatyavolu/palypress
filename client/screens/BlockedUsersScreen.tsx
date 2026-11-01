import React, { useCallback, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { removeLocalBlockedKey } from "@/lib/moderation";

type BlockedAuthor = {
  id: string;
  publicationId: string;
  blockedAuthorKey: string;
  blockedAuthorName: string;
};

export default function BlockedUsersScreen() {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, isDark } = useTheme();
  const [blocks, setBlocks] = useState<BlockedAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const subtleColor = isDark ? "rgba(255,255,255,0.5)" : "#888";
  const borderColor = isDark ? "rgba(255,255,255,0.1)" : "#E0E0E0";
  const cardBackground = isDark ? "rgba(255,255,255,0.06)" : "#fff";

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        new URL("/api/moderation/blocks", getApiUrl()),
        { credentials: "include" },
      );
      if (!response.ok) throw new Error("Failed to load blocked users");
      const data = await response.json();
      setBlocks(Array.isArray(data.blocks) ? data.blocks : []);
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not load blocked users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const unblock = (block: BlockedAuthor) => {
    Alert.alert(
      `Unblock ${block.blockedAuthorName}?`,
      "Their comments will show up in your feed again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unblock",
          onPress: async () => {
            try {
              await fetch(new URL("/api/moderation/blocks", getApiUrl()), {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  publicationId: block.publicationId,
                  blockedAuthorKey: block.blockedAuthorKey,
                }),
              });
              await removeLocalBlockedKey(block.blockedAuthorKey);
              setBlocks((prev) => prev.filter((item) => item.id !== block.id));
            } catch (error) {
              console.error(error);
              Alert.alert("Error", "Could not unblock this user.");
            }
          },
        },
      ],
    );
  };

  return (
    <ThemedView style={styles.container}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={subtleColor} />
        </View>
      ) : (
        <FlatList
          data={blocks}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingTop: headerHeight + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
            paddingHorizontal: Spacing.lg,
          }}
          ListEmptyComponent={
            <ThemedText style={[styles.empty, { color: subtleColor }]}>
              You have not blocked anyone. On a comment, tap Block to hide that
              author immediately.
            </ThemedText>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.row,
                { backgroundColor: cardBackground, borderColor },
              ]}
            >
              <View style={styles.rowText}>
                <ThemedText style={styles.name}>
                  {item.blockedAuthorName}
                </ThemedText>
                <ThemedText style={[styles.meta, { color: subtleColor }]}>
                  {item.publicationId}
                </ThemedText>
              </View>
              <Pressable onPress={() => unblock(item)} hitSlop={8}>
                <ThemedText style={[styles.unblock, { color: theme.link }]}>
                  Unblock
                </ThemedText>
              </Pressable>
            </View>
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  empty: { fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  rowText: { flex: 1, marginRight: Spacing.md },
  name: { fontSize: 16, fontWeight: "600" },
  meta: { fontSize: 13, marginTop: 2 },
  unblock: { fontSize: 15, fontWeight: "600" },
});
